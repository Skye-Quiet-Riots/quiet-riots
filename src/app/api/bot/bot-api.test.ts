import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createBotRequest } from '@/test/api-helpers';
import { POST } from './route';
import { _resetRateLimitStore } from '@/lib/rate-limit';
import { markTranslationsReady } from '@/lib/queries/suggestions';

// Mock after() — it throws synchronously outside Next.js request scope
const { mockAfter } = vi.hoisted(() => ({ mockAfter: vi.fn() }));
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: mockAfter };
});

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  _resetRateLimitStore();
  mockAfter.mockClear();
});

afterAll(async () => {
  await teardownTestDb();
});

async function callBot(action: string, params: Record<string, unknown> = {}) {
  const request = createBotRequest(action, params);
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

describe('Bot API authentication', () => {
  it('returns 401 without auth header', async () => {
    // Override to remove auth
    const noAuthRequest = new Request('http://localhost:3000/api/bot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'get_trending', params: {} }),
    });
    const response = await POST(noAuthRequest as never);
    expect(response.status).toBe(401);
  });

  it('returns 401 with wrong token', async () => {
    const request = createBotRequest('get_trending', {}, 'wrong-key');
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for unknown action', async () => {
    const { status, body } = await callBot('nonexistent');
    expect(status).toBe(400);
    expect(body.error).toContain('Unknown action');
  });
});

describe('Bot API: identify', () => {
  it('creates a new user from phone', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900000',
      name: 'Bot User',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // SafeUserProfile: phone is stripped from identify response
    expect(body.data.user.phone).toBeUndefined();
    expect(body.data.user.name).toBe('Bot User');
    expect(body.data.issues).toBeDefined();
  });

  it('returns existing user by phone', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+5511999999999',
    });
    expect(status).toBe(200);
    expect(body.data.user.name).toBe('Marcio R.');
  });

  it('fails without phone', async () => {
    const { status, body } = await callBot('identify', {});
    expect(status).toBe(400);
    expect(body.error).toContain('phone');
  });
});

describe('Bot API: search_issues', () => {
  it('finds issues by query', async () => {
    const { status, body } = await callBot('search_issues', { query: 'Rail' });
    expect(status).toBe(200);
    expect(body.data.issues.length).toBeGreaterThanOrEqual(1);
  });

  it('fails without query', async () => {
    const { status } = await callBot('search_issues', {});
    expect(status).toBe(400);
  });

  it('finds issues with natural language query (multi-word search)', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'my train keeps getting cancelled',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
  });

  it('handles query with only stop words gracefully', async () => {
    const { status, body } = await callBot('search_issues', { query: 'the and were' });
    expect(status).toBe(200);
    expect(Array.isArray(body.data.issues)).toBe(true);
  });

  it('handles long query within limits', async () => {
    const longQuery =
      'train cancelled delayed service not running problems everywhere ' +
      'commuters frustrated waiting platform announcement';
    const { status, body } = await callBot('search_issues', { query: longQuery });
    expect(status).toBe(200);
    expect(Array.isArray(body.data.issues)).toBe(true);
  });
});

describe('Bot API: get_trending', () => {
  it('returns trending issues', async () => {
    const { status, body } = await callBot('get_trending', { limit: 2 });
    expect(status).toBe(200);
    expect(body.data.issues).toHaveLength(2);
  });
});

describe('Bot API: get_issue', () => {
  it('returns full issue detail with parallel data', async () => {
    const { status, body } = await callBot('get_issue', { issue_id: 'issue-rail' });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('Rail Cancellations');
    expect(body.data.health).not.toBeNull();
    expect(body.data.countries).toBeDefined();
    expect(body.data.pivotOrgs).toBeDefined();
    expect(body.data.actionCount).toBeDefined();
    expect(body.data.synonyms).toBeDefined();
    expect(body.data.seasonalPattern).toBeDefined();
    expect(body.data.relatedIssues).toBeDefined();
  });

  it('returns 404 for missing issue', async () => {
    const { status } = await callBot('get_issue', { issue_id: 'nonexistent' });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_actions', () => {
  it('returns actions for an issue', async () => {
    const { status, body } = await callBot('get_actions', { issue_id: 'issue-rail' });
    expect(status).toBe(200);
    expect(body.data.actions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Bot API: get_community', () => {
  it('returns community data with parallel queries', async () => {
    const { status, body } = await callBot('get_community', { issue_id: 'issue-rail' });
    expect(status).toBe(200);
    expect(body.data.health).not.toBeNull();
    expect(body.data.feed).toBeDefined();
    expect(body.data.experts).toBeDefined();
    expect(body.data.countries).toBeDefined();
  });
});

describe('Bot API: join_issue / leave_issue', () => {
  it('joins a user to an issue', async () => {
    const { status, body } = await callBot('join_issue', {
      phone: '+5511999999999',
      issue_id: 'issue-broadband',
    });
    expect(status).toBe(200);
    expect(body.data.joined).toBe(true);
  });

  it('leaves an issue', async () => {
    const { status, body } = await callBot('leave_issue', {
      phone: '+5511999999999',
      issue_id: 'issue-broadband',
    });
    expect(status).toBe(200);
    expect(body.data.left).toBe(true);
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('join_issue', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: post_feed', () => {
  it('creates a feed post', async () => {
    const { status, body } = await callBot('post_feed', {
      phone: '+5511999999999',
      issue_id: 'issue-rail',
      content: 'Hello from the bot!',
    });
    expect(status).toBe(200);
    expect(body.data.post.content).toBe('Hello from the bot!');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('post_feed', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
      content: 'test',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_org_pivot', () => {
  it('returns org with issues and totalRioters', async () => {
    const { status, body } = await callBot('get_org_pivot', { org_id: 'org-southern' });
    expect(status).toBe(200);
    expect(body.data.org.name).toBe('Southern Rail');
    expect(body.data.issues).toBeDefined();
    expect(body.data.totalRioters).toBeDefined();
  });

  it('returns enriched community data (health, countries, experts)', async () => {
    const { status, body } = await callBot('get_org_pivot', { org_id: 'org-southern' });
    expect(status).toBe(200);
    expect(body.data).toHaveProperty('health');
    expect(body.data).toHaveProperty('countries');
    expect(body.data).toHaveProperty('experts');
    // experts should be non-empty (org-southern links to issue-rail with experts)
    expect(body.data.experts.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for missing org', async () => {
    const { status } = await callBot('get_org_pivot', { org_id: 'nonexistent' });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_org_community', () => {
  it('returns full community data for an org', async () => {
    const { status, body } = await callBot('get_org_community', { org_id: 'org-southern' });
    expect(status).toBe(200);
    expect(body.data).toHaveProperty('health');
    expect(body.data).toHaveProperty('feed');
    expect(body.data).toHaveProperty('experts');
    expect(body.data).toHaveProperty('countries');
    expect(body.data).toHaveProperty('actions');
    expect(body.data).toHaveProperty('reels');
    // org-southern links to issue-rail which has data
    expect(body.data.experts.length).toBeGreaterThanOrEqual(1);
    expect(body.data.actions.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for non-existent org', async () => {
    const { status } = await callBot('get_org_community', { org_id: 'nonexistent' });
    expect(status).toBe(404);
  });

  it('translates response for non-English locale', async () => {
    const { status, body } = await callBot('get_org_community', {
      org_id: 'org-southern',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    // Experts should be translated
    expect(body.data.experts).toBeDefined();
  });
});

describe('Bot API: get_orgs', () => {
  it('returns organisations', async () => {
    const { status, body } = await callBot('get_orgs', {});
    expect(status).toBe(200);
    expect(body.data.orgs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Bot API: add_synonym', () => {
  it('creates a synonym', async () => {
    const { status, body } = await callBot('add_synonym', {
      issue_id: 'issue-rail',
      term: 'rail delays',
    });
    expect(status).toBe(200);
    expect(body.data.synonym.term).toBe('rail delays');
  });
});

describe('Bot API: create_issue (now routes through suggestion pipeline)', () => {
  it('creates a pending issue + suggestion via phone', async () => {
    const { status, body } = await callBot('create_issue', {
      phone: '+447700900001',
      name: 'Water Quality',
      category: 'Environment',
      description: 'Poor water quality in rural areas',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.issue.name).toBe('Water Quality');
    expect(body.data.issue.category).toBe('Environment');
    expect(body.data.issue.description).toBe('Poor water quality in rural areas');
    expect(body.data.issue.status).toBe('pending_review');
    expect(body.data.suggestion).toBeTruthy();
    expect(body.data.suggestion.suggested_name).toBe('Water Quality');
    expect(body.data.close_matches).toBeDefined();
  });

  it('creates issue with defaults when no description', async () => {
    const { status, body } = await callBot('create_issue', {
      phone: '+5511999999999',
      name: 'School Funding',
      category: 'Education',
    });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('School Funding');
    expect(body.data.issue.description).toBe('');
    expect(body.data.issue.status).toBe('pending_review');
  });

  it('fails without phone', async () => {
    const { status, body } = await callBot('create_issue', {
      name: 'Some Issue',
      category: 'Health',
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('fails with invalid category', async () => {
    const { status, body } = await callBot('create_issue', {
      phone: '+447700900001',
      name: 'Invalid Category Issue',
      category: 'InvalidCategory',
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });
});

describe('Bot API: update_user', () => {
  it('updates user fields', async () => {
    const { status, body } = await callBot('update_user', {
      phone: '+5511999999999',
      time_available: '1min',
    });
    expect(status).toBe(200);
    expect(body.data.user.time_available).toBe('1min');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('update_user', {
      phone: '+19999999999',
    });
    expect(status).toBe(404);
  });
});

describe('get_riot_reel', () => {
  it('returns an unseen reel for the issue', async () => {
    const { status, body } = await callBot('get_riot_reel', {
      phone: '+5511999999999', // Marcio
      issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(body.data.reel).not.toBeNull();
    expect(body.data.reel.issue_id).toBe('issue-rail');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('get_riot_reel', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
    });
    expect(status).toBe(404);
  });
});

describe('submit_riot_reel', () => {
  it('creates a pending reel', async () => {
    const { status, body } = await callBot('submit_riot_reel', {
      phone: '+5511999999999', // Marcio
      issue_id: 'issue-broadband',
      youtube_url: 'https://www.youtube.com/watch?v=botsubmit01',
      caption: 'When BT said fibre was coming soon',
    });
    expect(status).toBe(200);
    expect(body.data.reel.status).toBe('pending');
    expect(body.data.reel.source).toBe('community');
    expect(body.data.reel.caption).toBe('When BT said fibre was coming soon');
  });

  it('fails for invalid YouTube URL', async () => {
    const { status, body } = await callBot('submit_riot_reel', {
      phone: '+5511999999999',
      issue_id: 'issue-broadband',
      youtube_url: 'not-a-url',
    });
    expect(status).toBe(400);
    expect(body.error).toBe('Invalid YouTube URL');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('submit_riot_reel', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
      youtube_url: 'https://www.youtube.com/watch?v=test1234567',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_wallet', () => {
  it('returns wallet for existing user', async () => {
    const { status, body } = await callBot('get_wallet', {
      phone: '+5511999999999', // Marcio
    });
    expect(status).toBe(200);
    expect(body.data.wallet).toBeDefined();
    expect(body.data.wallet.user_id).toBe('user-marcio');
    expect(body.data.summary).toBeDefined();
  });

  it('auto-creates wallet for user without one', async () => {
    // First ensure Marcio has a wallet (from previous test)
    // Now test with a user identified via bot
    await callBot('identify', {
      phone: '+447700900111',
      name: 'Wallet Test User',
    });
    const { status, body } = await callBot('get_wallet', {
      phone: '+447700900111',
    });
    expect(status).toBe(200);
    expect(body.data.wallet.balance_pence).toBe(0);
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('get_wallet', { phone: '+19999999999' });
    expect(status).toBe(404);
  });
});

describe('Bot API: topup_wallet', () => {
  it('instantly credits wallet with simulated top-up', async () => {
    const { status, body } = await callBot('topup_wallet', {
      phone: '+5511999999999',
      amount_pence: 500,
    });
    expect(status).toBe(200);
    expect(body.data.transaction.amount_pence).toBe(500);
    expect(body.data.transaction.type).toBe('topup');
    expect(body.data.wallet).toBeDefined();
    expect(body.data.wallet.balance_pence).toBeGreaterThan(0);
  });

  it('rejects topup below minimum', async () => {
    const { status, body } = await callBot('topup_wallet', {
      phone: '+5511999999999',
      amount_pence: 50,
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Minimum top-up');
  });
});

describe('Bot API: pay', () => {
  it('deducts from wallet and credits action initiative', async () => {
    // Sarah has wallet with £5 balance (seeded) — pay 10p
    const { status, body } = await callBot('pay', {
      phone: '+447700900001', // Sarah
      action_initiative_id: 'camp-water-test',
      amount_pence: 10,
    });
    expect(status).toBe(200);
    expect(body.data.transaction.amount_pence).toBe(10);
    expect(body.data.action_initiative).toBeDefined();
  });

  it('returns error for non-existent action initiative', async () => {
    const { status, body } = await callBot('pay', {
      phone: '+5511999999999',
      action_initiative_id: 'camp-nonexistent',
      amount_pence: 100,
    });
    expect(status).toBe(404);
    expect(body.error).toContain('Action initiative not found');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('pay', {
      phone: '+19999999999',
      action_initiative_id: 'camp-water-test',
      amount_pence: 100,
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_action_initiatives', () => {
  it('returns all action initiatives', async () => {
    const { status, body } = await callBot('get_action_initiatives', {});
    expect(status).toBe(200);
    expect(body.data.action_initiatives.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by issue_id', async () => {
    const { status, body } = await callBot('get_action_initiatives', {
      issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(
      body.data.action_initiatives.every((c: { issue_id: string }) => c.issue_id === 'issue-rail'),
    ).toBe(true);
  });

  it('filters by status', async () => {
    const { status, body } = await callBot('get_action_initiatives', {
      status: 'goal_reached',
    });
    expect(status).toBe(200);
    expect(
      body.data.action_initiatives.every((c: { status: string }) => c.status === 'goal_reached'),
    ).toBe(true);
  });
});

describe('Bot API: event tracking', () => {
  it('records bot events in bot_events table after action dispatch', async () => {
    const { getRecentBotEvents } = await import('@/lib/queries/bot-events');

    // Call an action that resolves a user (identify creates/finds user)
    await callBot('identify', { phone: '+447700900001', name: 'Sarah K.' });

    // Allow fire-and-forget tracking to complete
    await new Promise((r) => setTimeout(r, 100));

    const events = await getRecentBotEvents({ action: 'identify' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].action).toBe('identify');
    expect(events[0].status).toBe('ok');
    expect(events[0].user_id).toBeTruthy(); // User ID is resolved from phone
    expect(events[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('tracks issue_id from params', async () => {
    const { getRecentBotEvents } = await import('@/lib/queries/bot-events');

    await callBot('get_issue', { issue_id: 'issue-rail' });
    await new Promise((r) => setTimeout(r, 100));

    const events = await getRecentBotEvents({ action: 'get_issue' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    // Find the specific event — earlier tests may have created get_issue events with other issue_ids
    const railEvent = events.find((e) => e.issue_id === 'issue-rail');
    expect(railEvent).toBeDefined();
  });
});

describe('Bot API: get_category_assistants', () => {
  it('returns assistant for valid category', async () => {
    const { status, body } = await callBot('get_category_assistants', {
      category: 'transport',
    });
    expect(status).toBe(200);
    expect(body.data.assistant).toBeDefined();
    expect(body.data.assistant.agent_name).toBe('Jett');
    expect(body.data.assistant.human_name).toBe('Bex');
  });

  it('accepts language_code param', async () => {
    const { status, body } = await callBot('get_category_assistants', {
      category: 'transport',
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.assistant).toBeDefined();
    // Falls back to English since no translations seeded in test DB
    expect(body.data.assistant.agent_name).toBe('Jett');
    expect(body.data.assistant.goal).toBeDefined();
  });

  it('returns translated assistant data when translations exist', async () => {
    // Seed a translation row for the transport assistant's goal field
    const { getDb } = await import('@/lib/db');
    const { generateId } = await import('@/lib/uuid');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO translations (id, entity_type, entity_id, field, language_code, value, source)
            VALUES (?, 'category_assistant', 'asst-transport', 'goal', 'es', 'Meta en español', 'machine')
            ON CONFLICT(entity_type, entity_id, field, language_code) DO UPDATE SET value = excluded.value`,
      args: [generateId()],
    });

    const { status, body } = await callBot('get_category_assistants', {
      category: 'transport',
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.assistant.goal).toBe('Meta en español');
    // agent_name stays English (proper name, not translated)
    expect(body.data.assistant.agent_name).toBe('Jett');
  });

  it('returns 404 for nonexistent category', async () => {
    const { status, body } = await callBot('get_category_assistants', {
      category: 'nonexistent',
    });
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });
});

describe('Bot API: get_assistant_detail', () => {
  it('returns full detail for valid category', async () => {
    const { status, body } = await callBot('get_assistant_detail', {
      category: 'transport',
    });
    expect(status).toBe(200);
    expect(body.data.assistant).toBeDefined();
    expect(body.data.assistant.agent_name).toBeDefined();
    expect(body.data.assistant.human_name).toBeDefined();
    expect(body.data.assistant.riot_count).toBeGreaterThanOrEqual(0);
    expect(body.data.assistant.rioter_count).toBeGreaterThanOrEqual(0);
    expect(body.data.assistant.riots).toBeDefined();
    expect(body.data.assistant.recent_activity).toBeDefined();
    expect(typeof body.data.assistant.messages_sent).toBe('number');
  });

  it('accepts language_code param', async () => {
    const { status, body } = await callBot('get_assistant_detail', {
      category: 'transport',
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.assistant).toBeDefined();
    // Translation seeded by earlier test should be overlaid
    expect(body.data.assistant.goal).toBe('Meta en español');
    expect(body.data.assistant.riots).toBeDefined();
  });

  it('returns 404 for invalid category', async () => {
    const { status, body } = await callBot('get_assistant_detail', {
      category: 'nonexistent',
    });
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });
});

// ─── Evidence ─────────────────────────────────────────────

describe('Bot API: submit_evidence', () => {
  it('creates text evidence via bot', async () => {
    const { status, body } = await callBot('submit_evidence', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Evidence from bot test',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.content).toBe('Evidence from bot test');
    expect(body.data.evidence.media_type).toBe('text');
    expect(body.data.evidence.live).toBe(0);
  });

  it('creates evidence with org_id', async () => {
    const { status, body } = await callBot('submit_evidence', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Evidence about Southern Rail',
      org_id: 'org-southern',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.org_name).toBe('Southern Rail');
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('submit_evidence', {
      phone: '+449999999999',
      issue_id: 'issue-rail',
      content: 'Should fail',
    });
    expect(status).toBe(404);
  });

  it('creates video evidence with video_url', async () => {
    const { status, body } = await callBot('submit_evidence', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Video of overcrowded platform',
      video_url: 'https://abc.public.blob.vercel-storage.com/evidence/test.mp4',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.media_type).toBe('video');
    expect(body.data.evidence.video_url).toBe(
      'https://abc.public.blob.vercel-storage.com/evidence/test.mp4',
    );
  });

  it('video_url takes precedence over photo_url for mediaType', async () => {
    const { status, body } = await callBot('submit_evidence', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Mixed media evidence',
      photo_url: 'https://example.com/photo.jpg',
      video_url: 'https://example.com/video.mp4',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.media_type).toBe('video');
  });
});

describe('Bot API: get_evidence', () => {
  it('returns evidence for an issue', async () => {
    const { status, body } = await callBot('get_evidence', {
      issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.length).toBeGreaterThanOrEqual(3);
  });

  it('filters by org_id', async () => {
    const { status, body } = await callBot('get_evidence', {
      issue_id: 'issue-rail',
      org_id: 'org-southern',
    });
    expect(status).toBe(200);
    body.data.evidence.forEach((e: { org_id: string }) => {
      expect(e.org_id).toBe('org-southern');
    });
  });
});

describe('Bot API: go_live', () => {
  it('creates live evidence', async () => {
    const { status, body } = await callBot('go_live', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Going live from the platform!',
    });
    expect(status).toBe(200);
    expect(body.data.evidence.live).toBe(1);
    expect(body.data.evidence.media_type).toBe('live_stream');
  });

  it('returns encouragement message', async () => {
    const { status, body } = await callBot('go_live', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
      content: 'Live again!',
    });
    expect(status).toBe(200);
    expect(body.data.message).toContain('passionate');
  });
});

// ─── Language / Country ──────────────────────────────────

describe('Bot API: set_language', () => {
  it('updates user language preference', async () => {
    const { status, body } = await callBot('set_language', {
      phone: '+447700900001',
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('es');
    expect(body.data.language_code).toBe('es');
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('set_language', {
      phone: '+449999999999',
      language_code: 'fr',
    });
    expect(status).toBe(404);
  });

  it('validates language_code is required', async () => {
    const { status } = await callBot('set_language', {
      phone: '+447700900001',
    });
    expect(status).toBe(400);
  });
});

describe('Bot API: set_country', () => {
  it('updates user country preference', async () => {
    const { status, body } = await callBot('set_country', {
      phone: '+447700900001',
      country_code: 'GB',
    });
    expect(status).toBe(200);
    expect(body.data.user.country_code).toBe('GB');
    expect(body.data.country_code).toBe('GB');
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('set_country', {
      phone: '+449999999999',
      country_code: 'US',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: identify with language', () => {
  it('creates user with language_code when provided', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+819012345678',
      name: 'Japanese User',
      language_code: 'ja',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('ja');
    expect(body.data.language_code).toBe('ja');
  });

  it('defaults to en when no language_code provided', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+33612345678',
      name: 'French User',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('en');
    expect(body.data.language_code).toBe('en');
  });

  it('returns existing user language for returning users', async () => {
    // The Japanese user created above should be returned with their language
    const { status, body } = await callBot('identify', {
      phone: '+819012345678',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('ja');
  });
});

describe('Bot API: update_user with language and country', () => {
  it('updates language and country via update_user', async () => {
    const { status, body } = await callBot('update_user', {
      phone: '+447700900001',
      language_code: 'fr',
      country_code: 'FR',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('fr');
    expect(body.data.user.country_code).toBe('FR');
  });
});

// ─── Translated Data (language_code on data-fetching actions) ──────

describe('Bot API: translated issue data', () => {
  // Seed test translations before these tests
  beforeAll(async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();

    // Insert test language (FK constraint on translations table)
    await db.execute({
      sql: `INSERT OR IGNORE INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)`,
      args: ['pl', 'Polish', 'Polski', 'ltr'],
    });
    await db.execute({
      sql: `INSERT OR IGNORE INTO languages (code, name, native_name, direction) VALUES (?, ?, ?, ?)`,
      args: ['es', 'Spanish', 'Español', 'ltr'],
    });

    // Seed Polish translations for test issues
    const translations = [
      ['issue', 'issue-rail', 'name', 'pl', 'Odwołania pociągów'],
      ['issue', 'issue-rail', 'description', 'pl', 'Odwołania pociągów w całej sieci'],
      ['issue', 'issue-broadband', 'name', 'pl', 'Prędkość łącza szerokopasmowego'],
      ['issue', 'issue-broadband', 'description', 'pl', 'Wolne prędkości internetu'],
      ['organisation', 'org-southern', 'name', 'pl', 'Southern Rail'],
      ['organisation', 'org-southern', 'description', 'pl', 'Brytyjski operator kolejowy'],
      ['action_initiative', 'camp-water-test', 'title', 'pl', 'Przegląd prawny kolei'],
      [
        'action_initiative',
        'camp-water-test',
        'description',
        'pl',
        'Finansowanie niezależnego przeglądu prawnego',
      ],
    ];
    for (const [entityType, entityId, field, lang, value] of translations) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO translations (id, entity_type, entity_id, field, language_code, value, source)
              VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 'manual')`,
        args: [entityType, entityId, field, lang, value],
      });
    }
  });

  it('search_issues returns translated names when language_code is passed', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Odwołania pociągów');
  });

  it('search_issues returns English names when no language_code is passed', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Rail Cancellations');
  });

  it('get_trending returns translated names with language_code', async () => {
    const { status, body } = await callBot('get_trending', {
      limit: 10,
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    if (rail) {
      expect(rail.name).toBe('Odwołania pociągów');
    }
  });

  it('get_issue returns translated issue and pivot org names', async () => {
    const { status, body } = await callBot('get_issue', {
      issue_id: 'issue-rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('Odwołania pociągów');
    expect(body.data.issue.description).toBe('Odwołania pociągów w całej sieci');
  });

  it('get_issue returns English when language_code is en', async () => {
    const { status, body } = await callBot('get_issue', {
      issue_id: 'issue-rail',
      language_code: 'en',
    });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('Rail Cancellations');
  });

  it('get_org_pivot returns translated org name', async () => {
    const { status, body } = await callBot('get_org_pivot', {
      org_id: 'org-southern',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    expect(body.data.org.description).toBe('Brytyjski operator kolejowy');
  });

  it('get_orgs returns translated org names', async () => {
    const { status, body } = await callBot('get_orgs', {
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const southern = body.data.orgs.find((o: { id: string }) => o.id === 'org-southern');
    expect(southern).toBeDefined();
    expect(southern.description).toBe('Brytyjski operator kolejowy');
  });

  it('get_action_initiatives returns translated action initiative titles', async () => {
    const { status, body } = await callBot('get_action_initiatives', {
      issue_id: 'issue-rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const camp = body.data.action_initiatives.find(
      (c: { id: string }) => c.id === 'camp-water-test',
    );
    expect(camp).toBeDefined();
    expect(camp.title).toBe('Przegląd prawny kolei');
    expect(camp.description).toBe('Finansowanie niezależnego przeglądu prawnego');
  });

  it('identify returns translated user issues when user has language_code', async () => {
    // First set the user's language to Polish
    await callBot('set_language', {
      phone: '+5511999999999',
      language_code: 'pl',
    });
    // Now identify — should return translated issue names
    const { status, body } = await callBot('identify', {
      phone: '+5511999999999',
    });
    expect(status).toBe(200);
    expect(body.data.language_code).toBe('pl');
    // Marcio is a member of issue-rail (seeded)
    const railIssue = body.data.issues.find(
      (i: { issue_id: string }) => i.issue_id === 'issue-rail',
    );
    expect(railIssue).toBeDefined();
    expect(railIssue.issue_name).toBe('Odwołania pociągów');
  });

  it('actions still work with language_code param (no translation applied)', async () => {
    const { status, body } = await callBot('get_actions', {
      issue_id: 'issue-rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    expect(body.data.actions.length).toBeGreaterThanOrEqual(1);
    // Actions are still in English (not translated in DB)
    expect(body.data.actions[0].title).toBeTruthy();
  });

  // ─── Translated synonym search (bot surface) ───

  it('search_issues matches translated synonyms for non-English locale', async () => {
    // "trenes cancelados" is the Spanish translation of synonym "cancelled trains" for Rail Cancellations
    const { status, body } = await callBot('search_issues', {
      query: 'trenes cancelados',
      language_code: 'es',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
  });

  it('search_issues matches translated synonym for broadband in Spanish', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'internet lento',
      language_code: 'es',
    });
    expect(status).toBe(200);
    const broadband = body.data.issues.find((i: { id: string }) => i.id === 'issue-broadband');
    expect(broadband).toBeDefined();
  });

  it('search_issues does not match translated synonyms when locale is en', async () => {
    // "trenes cancelados" is Spanish — should NOT match in English locale
    const { status, body } = await callBot('search_issues', {
      query: 'trenes cancelados',
      language_code: 'en',
    });
    expect(status).toBe(200);
    expect(body.data.issues).toHaveLength(0);
  });

  it('get_issue returns translated synonyms for non-English locale', async () => {
    const { status, body } = await callBot('get_issue', {
      issue_id: 'issue-rail',
      language_code: 'es',
    });
    expect(status).toBe(200);
    const terms = body.data.synonyms.map((s: { term: string }) => s.term);
    // syn-001 and syn-002 have Spanish translations seeded
    expect(terms).toContain('cancelaciones de trenes');
    expect(terms).toContain('trenes cancelados');
  });

  it('get_issue returns English synonyms when locale is en', async () => {
    const { status, body } = await callBot('get_issue', {
      issue_id: 'issue-rail',
      language_code: 'en',
    });
    expect(status).toBe(200);
    const terms = body.data.synonyms.map((s: { term: string }) => s.term);
    expect(terms).toContain('train cancellations');
    expect(terms).toContain('cancelled trains');
  });

  // ─── Structural guard: all data-fetching actions must accept language_code ───
  // If you add a new action that returns translatable data (issues, orgs, action initiatives),
  // add it to this list. The test will fail if the action rejects language_code.

  const DATA_FETCHING_ACTIONS: { action: string; minParams: Record<string, unknown> }[] = [
    { action: 'search_issues', minParams: { query: 'test' } },
    { action: 'get_trending', minParams: {} },
    { action: 'get_issue', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_actions', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_community', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_org_pivot', minParams: { org_id: 'org-southern' } },
    { action: 'get_org_community', minParams: { org_id: 'org-southern' } },
    { action: 'get_orgs', minParams: {} },
    { action: 'get_action_initiatives', minParams: {} },
  ];

  it.each(DATA_FETCHING_ACTIONS)(
    '$action accepts language_code without validation error',
    async ({ action, minParams }) => {
      const { status, body } = await callBot(action, {
        ...minParams,
        language_code: 'pl',
      });
      // Should not return 400 validation error about language_code
      expect(status).not.toBe(400);
      if (status === 400) {
        expect(body.error).not.toContain('language_code');
      }
    },
  );
});

// ─── Phone-Based Language Fallback ────────────────────────

describe('Bot API: phone-based language fallback', () => {
  const marcioPhone = '+5511999999999';

  // Set Marcio to Spanish for these tests (earlier tests may have set him to Polish)
  beforeAll(async () => {
    await callBot('set_language', { phone: marcioPhone, language_code: 'es' });
  });

  // ─── Phone fallback delivers correct translations ───

  it('search_issues uses stored language when phone provided without language_code', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      phone: marcioPhone,
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Cancelaciones de trenes');
  });

  it('get_issue uses stored language when phone provided without language_code', async () => {
    const { status, body } = await callBot('get_issue', {
      issue_id: 'issue-rail',
      phone: marcioPhone,
    });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('Cancelaciones de trenes');
  });

  it('get_trending uses stored language when phone provided without language_code', async () => {
    const { status, body } = await callBot('get_trending', {
      limit: 20,
      phone: marcioPhone,
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    if (rail) {
      expect(rail.name).toBe('Cancelaciones de trenes');
    }
  });

  // ─── Priority: explicit language_code > stored preference ───

  it('explicit language_code overrides stored user preference from phone', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      phone: marcioPhone,
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Odwołania pociągów');
  });

  // ─── Edge cases ───

  it('defaults to English when neither phone nor language_code provided', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Rail Cancellations');
  });

  it('defaults to English when phone matches no user', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      phone: '+19999999999',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Rail Cancellations');
  });

  it('explicit language_code without phone works (backwards compat)', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Odwołania pociągów');
  });

  it('phone of user with default en language returns English', async () => {
    // Sarah has default 'en' language (or was set to fr/es in earlier tests — reset to en)
    await callBot('set_language', { phone: '+447700900001', language_code: 'en' });
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    const rail = body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Rail Cancellations');
  });

  // ─── Structural guard: all translating actions accept phone ───

  const PHONE_ACCEPTING_DATA_ACTIONS: { action: string; minParams: Record<string, unknown> }[] = [
    { action: 'search_issues', minParams: { query: 'test' } },
    { action: 'get_trending', minParams: {} },
    { action: 'get_issue', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_org_pivot', minParams: { org_id: 'org-southern' } },
    { action: 'get_orgs', minParams: {} },
    { action: 'get_action_initiatives', minParams: {} },
  ];

  it.each(PHONE_ACCEPTING_DATA_ACTIONS)(
    '$action accepts phone param without validation error',
    async ({ action, minParams }) => {
      const { status, body } = await callBot(action, {
        ...minParams,
        phone: '+447700900001',
      });
      expect(status).not.toBe(400);
      if (status === 400) {
        expect(body.error).not.toContain('phone');
      }
    },
  );
});

// ─── Identify Language Auto-Update ────────────────────────

describe('Bot API: identify language auto-update', () => {
  const testPhone = '+12025551234';

  it('creates new user with default en when no language_code passed', async () => {
    const { status, body } = await callBot('identify', {
      phone: testPhone,
      name: 'Lang Test User',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('en');
    expect(body.data.language_code).toBe('en');
  });

  it('auto-updates language when identify called with different language_code', async () => {
    const { status, body } = await callBot('identify', {
      phone: testPhone,
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('es');
    expect(body.data.language_code).toBe('es');
  });

  it('preserves language when identify called without language_code', async () => {
    const { status, body } = await callBot('identify', {
      phone: testPhone,
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('es');
    expect(body.data.language_code).toBe('es');
  });

  it('no-op when identify called with same language_code as stored', async () => {
    const { status, body } = await callBot('identify', {
      phone: testPhone,
      language_code: 'es',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('es');
    expect(body.data.language_code).toBe('es');
  });
});

// ─── Regression: Full Flow (identify → search with phone fallback) ───

describe('Bot API: language fallback regression test', () => {
  const regressionPhone = '+34612345001';

  it('identify sets language, then search uses phone fallback for translations', async () => {
    // Step 1: User identified with language_code: 'es' (as OpenClaw would do)
    const identifyResult = await callBot('identify', {
      phone: regressionPhone,
      name: 'Spanish User',
      language_code: 'es',
    });
    expect(identifyResult.status).toBe(200);
    expect(identifyResult.body.data.language_code).toBe('es');

    // Step 2: Search with phone only (no language_code) — simulates LLM forgetting the param
    const searchResult = await callBot('search_issues', {
      query: 'Rail',
      phone: regressionPhone,
    });
    expect(searchResult.status).toBe(200);
    const rail = searchResult.body.data.issues.find((i: { id: string }) => i.id === 'issue-rail');
    expect(rail).toBeDefined();
    expect(rail.name).toBe('Cancelaciones de trenes');
  });
});

// ─── User Memory ──────────────────────────────────────────

describe('Bot API: save_memory', () => {
  it('saves a memory for an existing user', async () => {
    const { status, body } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'commute_route',
      value: 'Manchester to Leeds, 07:42',
      category: 'context',
    });
    expect(status).toBe(200);
    expect(body.data.memory.memory_key).toBe('commute_route');
    expect(body.data.memory.memory_value).toBe('Manchester to Leeds, 07:42');
    expect(body.data.memory.category).toBe('context');
  });

  it('upserts when saving with the same key', async () => {
    await callBot('save_memory', {
      phone: '+447700900001',
      key: 'upsert_test_key',
      value: 'original',
    });
    const { status, body } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'upsert_test_key',
      value: 'updated',
    });
    expect(status).toBe(200);
    expect(body.data.memory.memory_value).toBe('updated');
  });

  it('defaults category to general', async () => {
    const { status, body } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'default_cat_test',
      value: 'A general note',
    });
    expect(status).toBe(200);
    expect(body.data.memory.category).toBe('general');
  });

  it('sanitizes input text', async () => {
    const { status, body } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'sanitize_test',
      value: 'Clean\x00text',
    });
    expect(status).toBe(200);
    expect(body.data.memory.memory_value).not.toContain('\x00');
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+19999999999',
      key: 'test',
      value: 'test',
    });
    expect(status).toBe(404);
  });

  it('rejects empty key', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+447700900001',
      key: '',
      value: 'test',
    });
    expect(status).toBe(400);
  });

  it('rejects empty value', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'test',
      value: '',
    });
    expect(status).toBe(400);
  });

  it('rejects invalid category', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'test',
      value: 'test',
      category: 'invalid',
    });
    expect(status).toBe(400);
  });

  it('rejects key over 100 chars', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'x'.repeat(101),
      value: 'test',
    });
    expect(status).toBe(400);
  });

  it('rejects value over 500 chars', async () => {
    const { status } = await callBot('save_memory', {
      phone: '+447700900001',
      key: 'test',
      value: 'x'.repeat(501),
    });
    expect(status).toBe(400);
  });
});

describe('Bot API: get_memories', () => {
  it('returns all memories for a user', async () => {
    // Save a couple of memories first
    await callBot('save_memory', {
      phone: '+5511999999999',
      key: 'pref_1',
      value: 'Prefers Portuguese',
      category: 'preference',
    });
    await callBot('save_memory', {
      phone: '+5511999999999',
      key: 'goal_1',
      value: 'Wants to find rail issues in Brazil',
      category: 'goal',
    });

    const { status, body } = await callBot('get_memories', {
      phone: '+5511999999999',
    });
    expect(status).toBe(200);
    expect(body.data.memories.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for user with no memories', async () => {
    await callBot('identify', { phone: '+447700900222', name: 'No Memory User' });
    const { status, body } = await callBot('get_memories', {
      phone: '+447700900222',
    });
    expect(status).toBe(200);
    expect(body.data.memories).toEqual([]);
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('get_memories', { phone: '+19999999999' });
    expect(status).toBe(404);
  });
});

describe('Bot API: delete_memory', () => {
  it('deletes an existing memory', async () => {
    await callBot('save_memory', {
      phone: '+447700900001',
      key: 'delete_api_test',
      value: 'to be deleted',
    });
    const { status, body } = await callBot('delete_memory', {
      phone: '+447700900001',
      key: 'delete_api_test',
    });
    expect(status).toBe(200);
    expect(body.data.deleted).toBe(true);

    // Verify it's gone
    const { body: memBody } = await callBot('get_memories', { phone: '+447700900001' });
    const found = memBody.data.memories.find(
      (m: { memory_key: string }) => m.memory_key === 'delete_api_test',
    );
    expect(found).toBeUndefined();
  });

  it('returns ok for non-existent key (idempotent)', async () => {
    const { status, body } = await callBot('delete_memory', {
      phone: '+447700900001',
      key: 'nonexistent_key_xyz',
    });
    expect(status).toBe(200);
    expect(body.data.deleted).toBe(false);
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await callBot('delete_memory', {
      phone: '+19999999999',
      key: 'test',
    });
    expect(status).toBe(404);
  });

  it('rejects empty key', async () => {
    const { status } = await callBot('delete_memory', {
      phone: '+447700900001',
      key: '',
    });
    expect(status).toBe(400);
  });
});

describe('Bot API: identify returns memories', () => {
  it('includes memories in identify response', async () => {
    // Save a memory for Sarah
    await callBot('save_memory', {
      phone: '+447700900001',
      key: 'identify_test_mem',
      value: 'Should appear in identify response',
    });

    const { status, body } = await callBot('identify', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    expect(body.data.memories).toBeDefined();
    expect(Array.isArray(body.data.memories)).toBe(true);
    const testMemory = body.data.memories.find(
      (m: { memory_key: string }) => m.memory_key === 'identify_test_mem',
    );
    expect(testMemory).toBeDefined();
    expect(testMemory.memory_value).toBe('Should appear in identify response');
  });

  it('returns empty memories array for new user', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900333',
      name: 'Brand New User',
    });
    expect(status).toBe(200);
    expect(body.data.memories).toEqual([]);
  });

  it('save_memory then identify returns the saved memory', async () => {
    await callBot('save_memory', {
      phone: '+5511999999999',
      key: 'roundtrip_test',
      value: 'Round trip verified',
      category: 'context',
    });
    const { body } = await callBot('identify', { phone: '+5511999999999' });
    const mem = body.data.memories.find(
      (m: { memory_key: string }) => m.memory_key === 'roundtrip_test',
    );
    expect(mem).toBeDefined();
    expect(mem.memory_value).toBe('Round trip verified');
    expect(mem.category).toBe('context');
  });
});

describe('Bot API: memory cross-user isolation', () => {
  it('user A memories are not visible to user B', async () => {
    await callBot('save_memory', {
      phone: '+447700900001',
      key: 'sarah_private',
      value: 'Only for Sarah',
    });
    const { body } = await callBot('get_memories', { phone: '+5511999999999' });
    const found = body.data.memories.find(
      (m: { memory_key: string }) => m.memory_key === 'sarah_private',
    );
    expect(found).toBeUndefined();
  });
});

// ─── Structural guard: all memory actions resolve user by phone ───

const MEMORY_ACTIONS: { action: string; minParams: Record<string, unknown> }[] = [
  { action: 'save_memory', minParams: { phone: '+19999999999', key: 'test', value: 'test' } },
  { action: 'get_memories', minParams: { phone: '+19999999999' } },
  { action: 'delete_memory', minParams: { phone: '+19999999999', key: 'test' } },
];

describe('Bot API: memory structural guards', () => {
  it.each(MEMORY_ACTIONS)(
    '$action returns 404 for unknown phone',
    async ({ action, minParams }) => {
      const { status } = await callBot(action, minParams);
      expect(status).toBe(404);
    },
  );
});

// ─── Suggestion Pipeline ───────────────────────────────────

describe('Bot API: suggest_riot', () => {
  it('creates a suggestion + pending issue', async () => {
    const { status, body } = await callBot('suggest_riot', {
      phone: '+447700900003', // user-new
      suggested_name: 'Pothole Crisis',
      original_text: 'There are too many potholes on my road',
      category: 'Transport',
      description: 'Potholes everywhere causing damage',
      public_recognition: true,
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.suggestion).toBeTruthy();
    expect(body.data.suggestion.suggested_name).toBe('Pothole Crisis');
    expect(body.data.suggestion.status).toBe('pending_review');
    expect(body.data.entity_type).toBe('issue');
    expect(body.data.entity_id).toBeTruthy();
    expect(body.data.close_matches).toBeDefined();
    expect(body.data.message).toContain('limited way');
  });

  it('creates a suggestion + pending organisation', async () => {
    const { status, body } = await callBot('suggest_riot', {
      phone: '+5511999999999', // user-marcio
      suggested_name: 'MegaTelecom',
      original_text: 'MegaTelecom is overcharging everyone',
      suggested_type: 'organisation',
      category: 'Telecoms',
    });
    expect(status).toBe(200);
    expect(body.data.entity_type).toBe('organisation');
    expect(body.data.suggestion.suggested_type).toBe('organisation');
  });

  it('returns 404 for unknown phone', async () => {
    const { status } = await callBot('suggest_riot', {
      phone: '+19999999999',
      suggested_name: 'Test',
      original_text: 'Test',
      category: 'Other',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_suggestion_status', () => {
  it('returns suggestions for user', async () => {
    // user-new created a suggestion above in suggest_riot test
    const { status, body } = await callBot('get_suggestion_status', {
      phone: '+447700900003',
    });
    expect(status).toBe(200);
    expect(body.data.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for unknown phone', async () => {
    const { status } = await callBot('get_suggestion_status', {
      phone: '+19999999999',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: review_suggestion', () => {
  it('rejects non-guide users', async () => {
    // user-new has no role
    const { status, body } = await callBot('review_suggestion', {
      phone: '+447700900003',
      suggestion_id: 'suggestion-mobile',
      decision: 'approve',
    });
    expect(status).toBe(403);
    expect(body.error).toContain('Setup Guide role required');
  });

  it('allows setup guide to approve a suggestion', async () => {
    // user-sarah is a setup_guide
    const { status, body } = await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: 'suggestion-mobile',
      decision: 'approve',
      reviewer_notes: 'Looks good — important issue',
    });
    expect(status).toBe(200);
    expect(body.data.decision).toBe('approved');
    expect(body.data.suggestion.status).toBe('approved');
  });

  it('schedules auto-translation via after() on approval', async () => {
    // Create a fresh suggestion to approve (suggestion-mobile was already approved above)
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+5511999999999',
      suggested_name: 'Test Auto Translate',
      original_text: 'Testing auto translate',
      category: 'Other',
    });
    const sugId = suggestBody.data.suggestion.id;

    mockAfter.mockClear();
    await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
      decision: 'approve',
    });

    // after() should have been called to schedule translation generation
    expect(mockAfter).toHaveBeenCalled();
  });

  it('allows administrator to reject a suggestion', async () => {
    // First create a fresh suggestion to reject
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+5511999999999',
      suggested_name: 'About Bob',
      original_text: 'Bob is annoying',
      category: 'Other',
    });
    const sugId = suggestBody.data.suggestion.id;

    // user-admin is administrator
    const { status, body } = await callBot('review_suggestion', {
      phone: '+447974766838',
      suggestion_id: sugId,
      decision: 'reject',
      rejection_reason: 'about_people',
      rejection_detail: 'Quiet Riots are about issues, not people',
    });
    expect(status).toBe(200);
    expect(body.data.decision).toBe('rejected');
    expect(body.data.suggestion.status).toBe('rejected');
  });

  it('requires rejection_reason for reject', async () => {
    const { status, body } = await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: 'suggestion-mobile',
      decision: 'reject',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('rejection_reason');
  });

  it('allows merge with merge_into_issue_id', async () => {
    // Create another suggestion to merge
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+447700900003',
      suggested_name: 'Rail Delays Again',
      original_text: 'Trains always late',
      category: 'Transport',
    });
    const sugId = suggestBody.data.suggestion.id;

    const { status, body } = await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
      decision: 'merge',
      merge_into_issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(body.data.decision).toBe('merged');
    expect(body.data.suggestion.status).toBe('merged');
  });

  it('allows more_info request with reviewer_notes', async () => {
    // Create a fresh suggestion
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+447700900003',
      suggested_name: 'Unclear Issue',
      original_text: 'Things are bad',
      category: 'Other',
    });
    const sugId = suggestBody.data.suggestion.id;

    const { status, body } = await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
      decision: 'more_info',
      reviewer_notes: 'Can you be more specific?',
    });
    expect(status).toBe(200);
    expect(body.data.decision).toBe('more_info');
    expect(body.data.suggestion.status).toBe('more_info_requested');
  });

  it('returns 404 for non-existent suggestion', async () => {
    const { status } = await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: 'does-not-exist',
      decision: 'approve',
    });
    expect(status).toBe(404);
  });

  it('sends approval notification in the suggestion language', async () => {
    // Create suggestion with explicit language_code
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+5511999999999',
      suggested_name: 'Localised Notification Test',
      original_text: 'Testing localised approval',
      category: 'Other',
    });
    const sugId = suggestBody.data.suggestion.id;

    // Set the suggestion's language_code to 'en' (so we can verify it uses BotMessages template)
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: "UPDATE issue_suggestions SET language_code = 'en' WHERE id = ?",
      args: [sugId],
    });

    // Approve it
    await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
      decision: 'approve',
    });

    // Check the WhatsApp message uses the BotMessages template
    const msgs = await db.execute({
      sql: "SELECT whatsapp_message FROM messages WHERE entity_id = ? AND type = 'suggestion_approved' ORDER BY created_at DESC LIMIT 1",
      args: [sugId],
    });
    const whatsappMsg = msgs.rows[0]?.whatsapp_message as string | null;
    // Should match the BotMessages.suggestionApproved template (not the old "subject: body" format)
    expect(whatsappMsg).toContain('Good news');
    expect(whatsappMsg).toContain('Localised Notification Test');
    expect(whatsappMsg).toContain('approved');
    // Should NOT contain the old format "Thumbs Up:" prefix
    expect(whatsappMsg).not.toContain('Thumbs Up');
  });
});

describe('Bot API: respond_more_info', () => {
  it('allows first rioter to respond', async () => {
    // Create a suggestion and request more info
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+5511999999999',
      suggested_name: 'Internet Speed',
      original_text: 'Internet too slow',
      category: 'Telecoms',
    });
    const sugId = suggestBody.data.suggestion.id;

    // Guide requests more info
    await callBot('review_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
      decision: 'more_info',
      reviewer_notes: 'Which provider?',
    });

    // First rioter responds
    const { status, body } = await callBot('respond_more_info', {
      phone: '+5511999999999',
      suggestion_id: sugId,
      response: 'BT Broadband — speeds are terrible in my area',
    });
    expect(status).toBe(200);
    expect(body.data.message).toContain('Setup Guide');
  });

  it('rejects response from non-owner', async () => {
    // user-sarah trying to respond to user-marcio's suggestion
    const suggestions = await callBot('get_suggestion_status', {
      phone: '+5511999999999',
    });
    const marcioSuggestion = suggestions.body.data.suggestions[0];

    const { status, body } = await callBot('respond_more_info', {
      phone: '+447700900001', // sarah, not marcio
      suggestion_id: marcioSuggestion.id,
      response: 'I am not the owner',
    });
    expect(status).toBe(403);
    expect(body.error).toContain('your own suggestions');
  });
});

describe('Bot API: go_live_suggestion', () => {
  it('rejects non-guide users', async () => {
    const { status, body } = await callBot('go_live_suggestion', {
      phone: '+447700900003', // user-new, no role
      suggestion_id: 'suggestion-mobile',
    });
    expect(status).toBe(403);
    expect(body.error).toContain('Setup Guide role required');
  });

  it('rejects go-live for approved (not translations_ready) suggestion', async () => {
    // suggestion-mobile is 'approved' from review test — go-live requires 'translations_ready'
    const { status, body } = await callBot('go_live_suggestion', {
      phone: '+447700900001',
      suggestion_id: 'suggestion-mobile',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Translations must be ready');
  });

  it('makes a translations_ready suggestion live', async () => {
    // Manually transition to translations_ready (simulates async generation completing)
    await markTranslationsReady('suggestion-mobile');
    const { status, body } = await callBot('go_live_suggestion', {
      phone: '+447700900001', // sarah — setup_guide
      suggestion_id: 'suggestion-mobile',
    });
    expect(status).toBe(200);
    expect(body.data.suggestion.status).toBe('live');
    expect(body.data.message).toContain('live');
  });

  it('rejects going live on pending suggestion', async () => {
    // Create a fresh pending suggestion
    const { body: suggestBody } = await callBot('suggest_riot', {
      phone: '+5511999999999',
      suggested_name: 'Fresh Pending',
      original_text: 'Still pending',
      category: 'Other',
    });
    const sugId = suggestBody.data.suggestion.id;

    const { status, body } = await callBot('go_live_suggestion', {
      phone: '+447700900001',
      suggestion_id: sugId,
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Translations must be ready');
  });
});

// ─── Inbox / Messages ──────────────────────────────────────

describe('Bot API: get_inbox', () => {
  it('returns messages for user', async () => {
    // user-sarah should have messages from seed + suggestion notifications
    const { status, body } = await callBot('get_inbox', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    expect(body.data.messages).toBeDefined();
    expect(body.data.unread_count).toBeDefined();
    expect(typeof body.data.unread_count).toBe('number');
  });

  it('returns 404 for unknown phone', async () => {
    const { status } = await callBot('get_inbox', {
      phone: '+19999999999',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: mark_message_read', () => {
  it('marks a message as read', async () => {
    // msg-001 is for user-sarah, initially unread in seed
    const { status, body } = await callBot('mark_message_read', {
      phone: '+447700900001',
      message_id: 'msg-001',
    });
    expect(status).toBe(200);
    expect(body.data.marked).toBe(true);
  });

  it('returns false for wrong recipient', async () => {
    // msg-003 is for user-marcio, not sarah
    const { status, body } = await callBot('mark_message_read', {
      phone: '+447700900001',
      message_id: 'msg-003',
    });
    expect(status).toBe(200);
    expect(body.data.marked).toBe(false);
  });
});

describe('Bot API: mark_all_read', () => {
  it('marks all messages as read for user', async () => {
    const { status, body } = await callBot('mark_all_read', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    expect(body.data.marked_count).toBeGreaterThanOrEqual(0);

    // Verify no unread messages remain
    const { body: inboxBody } = await callBot('get_inbox', {
      phone: '+447700900001',
      unread_only: true,
    });
    expect(inboxBody.data.messages).toHaveLength(0);
  });
});

// ─── Structural guards for suggestion actions ──────────────

const SUGGESTION_ACTIONS: { action: string; minParams: Record<string, unknown> }[] = [
  {
    action: 'suggest_riot',
    minParams: {
      phone: '+19999999999',
      suggested_name: 'Test',
      original_text: 'Test',
      category: 'Other',
    },
  },
  { action: 'get_suggestion_status', minParams: { phone: '+19999999999' } },
  {
    action: 'respond_more_info',
    minParams: { phone: '+19999999999', suggestion_id: 'x', response: 'y' },
  },
  {
    action: 'review_suggestion',
    minParams: { phone: '+19999999999', suggestion_id: 'x', decision: 'approve' },
  },
  { action: 'go_live_suggestion', minParams: { phone: '+19999999999', suggestion_id: 'x' } },
  { action: 'get_inbox', minParams: { phone: '+19999999999' } },
  { action: 'mark_message_read', minParams: { phone: '+19999999999', message_id: 'x' } },
  { action: 'mark_all_read', minParams: { phone: '+19999999999' } },
];

describe('Bot API: suggestion/inbox structural guards', () => {
  it.each(SUGGESTION_ACTIONS)(
    '$action returns 404 for unknown phone',
    async ({ action, minParams }) => {
      const { status } = await callBot(action, minParams);
      expect(status).toBe(404);
    },
  );
});

// ─── Email Linking Tests ────────────────────────────────────
describe('Bot API: link_email', () => {
  it('sends verification email for valid email', async () => {
    const { status, body } = await callBot('link_email', {
      phone: '+447700900001', // sarah
      email: 'newemail@example.com',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.sent).toBe(true);
    expect(body.data.email).toBe('newemail@example.com');
  });

  it('rejects invalid email', async () => {
    const { status, body } = await callBot('link_email', {
      phone: '+447700900001',
      email: 'not-an-email',
    });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('returns 404 for unknown phone', async () => {
    const { status } = await callBot('link_email', {
      phone: '+449999999999',
      email: 'test@example.com',
    });
    expect(status).toBe(404);
  });

  it('rejects email already used by another user', async () => {
    // user-marcio has marcio@example.com — try to link sarah to it
    const { status, body } = await callBot('link_email', {
      phone: '+447700900001', // sarah
      email: 'marcio@example.com',
    });
    expect(status).toBe(409);
    expect(body.ok).toBe(false);
  });
});

describe('Bot API: verify_email_status', () => {
  it('shows email status for user with real email', async () => {
    const { status, body } = await callBot('verify_email_status', {
      phone: '+447700900001', // sarah has sarah@example.com
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.email).toBe('sarah@example.com');
    expect(body.data.is_placeholder).toBe(false);
    expect(body.data.verified).toBe(true);
  });

  it('returns 404 for unknown phone', async () => {
    const { status } = await callBot('verify_email_status', {
      phone: '+449999999999',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: OTP delivery', () => {
  // Clean up phone verification codes between tests to prevent state leakage
  beforeEach(async () => {
    const { _resetVerificationCodes } = await import('@/lib/queries/phone-verification');
    await _resetVerificationCodes();
  });

  it('get_undelivered_codes requires auth', async () => {
    const noAuthRequest = new Request('http://localhost:3000/api/bot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'get_undelivered_codes', params: {} }),
    });
    const response = await POST(noAuthRequest as never);
    expect(response.status).toBe(401);
  });

  it('get_undelivered_codes returns pending codes', async () => {
    // Import and create a code with delivery message
    const { createVerificationCode } = await import('@/lib/queries/phone-verification');
    await createVerificationCode('+447700900099', undefined, 'Your code is 123456');

    const { status, body } = await callBot('get_undelivered_codes', {});
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.codes.length).toBe(1);
    expect(body.data.codes[0].phone).toBe('+447700900099');
    expect(body.data.codes[0].delivery_message).toBe('Your code is 123456');
    expect(body.data.codes[0].id).toBeTruthy();
  });

  it('get_undelivered_codes returns empty when none pending', async () => {
    const { status, body } = await callBot('get_undelivered_codes', {});
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.codes).toEqual([]);
  });

  it('mark_code_delivered marks code and returns delivered=true', async () => {
    const { createVerificationCode } = await import('@/lib/queries/phone-verification');
    const { id } = await createVerificationCode('+447700900099', undefined, 'Your code is 123456');

    const { status, body } = await callBot('mark_code_delivered', { code_id: id });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.delivered).toBe(true);

    // Verify it's no longer in undelivered list
    const { body: body2 } = await callBot('get_undelivered_codes', {});
    expect(body2.data.codes.length).toBe(0);
  });

  it('mark_code_delivered returns delivered=false for invalid id', async () => {
    const { status, body } = await callBot('mark_code_delivered', {
      code_id: 'non-existent-id',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.delivered).toBe(false);
  });

  it('mark_code_delivered requires code_id', async () => {
    const { status, body } = await callBot('mark_code_delivered', {});
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });
});

// ─── Share Scheme ─────────────────────────────────────────────
describe('Bot API: Share Scheme', () => {
  const SHARE_PHONE = '+447700900001'; // user-sarah

  beforeEach(async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    // Clean share tables between tests
    await db.execute({ sql: 'DELETE FROM share_messages', args: [] });
    await db.execute({ sql: 'DELETE FROM share_status_history', args: [] });
    await db.execute({ sql: 'DELETE FROM share_audit_log', args: [] });
    await db.execute({ sql: 'DELETE FROM share_identities', args: [] });
    await db.execute({ sql: 'DELETE FROM share_applications', args: [] });
    // Ensure treasury system user exists (wallets FK requires a user row)
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, email, status)
            VALUES ('treasury', 'Quiet Riots Treasury', 'treasury@system.quietriots.com', 'active')`,
      args: [],
    });
    // Ensure treasury wallet exists
    await db.execute({
      sql: `INSERT OR IGNORE INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence)
            VALUES ('treasury-wallet', 'treasury', 0, 0, 0)`,
      args: [],
    });
    // Reset treasury wallet balance to 0
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 0 WHERE id = 'treasury-wallet'`,
      args: [],
    });
    // Reset sarah's wallet balance to £5
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 500 WHERE id = 'wallet-sarah'`,
      args: [],
    });
  });

  it('get_share_status returns eligibility info for user', async () => {
    const { status, body } = await callBot('get_share_status', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBeDefined();
    expect(body.data.eligibility).toBeDefined();
    expect(body.data.eligibility.riots_required).toBe(3);
    expect(body.data.eligibility.actions_required).toBe(10);
    expect(body.data.payment_required_pence).toBe(10);
  });

  it('get_share_status returns 404 for unknown phone', async () => {
    const { status, body } = await callBot('get_share_status', { phone: '+447700999999' });
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it('get_share_eligibility returns progress', async () => {
    const { status, body } = await callBot('get_share_eligibility', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.data.eligible).toBe('boolean');
    expect(typeof body.data.riots_joined).toBe('number');
    expect(typeof body.data.actions_taken).toBe('number');
    expect(body.data.message).toBeDefined();
  });

  it('apply_for_share fails when user is not eligible', async () => {
    const { status, body } = await callBot('apply_for_share', { phone: SHARE_PHONE });
    // Sarah is not eligible (only 1 riot joined, needs 3)
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('not yet eligible');
  });

  it('apply_for_share succeeds when status is available', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    // Force the application to available status
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES ('app-sarah', 'user-sarah', 'available')`,
      args: [],
    });

    const { status, body } = await callBot('apply_for_share', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('under_review');
    expect(body.data.message).toContain('10p');
  });

  it('apply_for_share fails with insufficient balance', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    // Force available status and zero wallet balance
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES ('app-sarah', 'user-sarah', 'available')`,
      args: [],
    });
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 0 WHERE id = 'wallet-sarah'`,
      args: [],
    });

    const { status, body } = await callBot('apply_for_share', { phone: SHARE_PHONE });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Insufficient');
  });

  it('decline_share works when status is available', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES ('app-sarah', 'user-sarah', 'available')`,
      args: [],
    });

    const { status, body } = await callBot('decline_share', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('declined');
  });

  it('decline_share fails when no application', async () => {
    const { status, body } = await callBot('decline_share', { phone: SHARE_PHONE });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('withdraw_share fails when no application in withdrawable state', async () => {
    const { status, body } = await callBot('withdraw_share', { phone: SHARE_PHONE });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('withdraw_share works for under_review application', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status, payment_amount_pence) VALUES ('app-sarah', 'user-sarah', 'under_review', 10)`,
      args: [],
    });
    // Give treasury the 10p that would have been received
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 10 WHERE id = 'treasury-wallet'`,
      args: [],
    });

    const { status, body } = await callBot('withdraw_share', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('withdrawn');
    expect(body.data.message).toContain('refunded');
  });

  it('reapply_share works after rejection', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status, reapply_count) VALUES ('app-sarah', 'user-sarah', 'rejected', 0)`,
      args: [],
    });

    const { status, body } = await callBot('reapply_share', { phone: SHARE_PHONE });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('under_review');
  });

  it('reapply_share fails with insufficient balance', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status, reapply_count) VALUES ('app-sarah', 'user-sarah', 'rejected', 0)`,
      args: [],
    });
    await db.execute({
      sql: `UPDATE wallets SET balance_pence = 0 WHERE id = 'wallet-sarah'`,
      args: [],
    });

    const { status, body } = await callBot('reapply_share', { phone: SHARE_PHONE });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Insufficient');
  });

  it('ask_share_question sends message to share guide', async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO share_applications (id, user_id, status) VALUES ('app-sarah', 'user-sarah', 'under_review')`,
      args: [],
    });

    const { status, body } = await callBot('ask_share_question', {
      phone: SHARE_PHONE,
      message: 'When will my share be approved?',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.message).toContain('question has been sent');

    // Verify message was stored
    const msgs = await db.execute({
      sql: `SELECT * FROM share_messages WHERE application_id = 'app-sarah'`,
      args: [],
    });
    expect(msgs.rows.length).toBe(1);
    expect(msgs.rows[0].sender_role).toBe('applicant');
  });

  it('ask_share_question fails without application', async () => {
    const { status, body } = await callBot('ask_share_question', {
      phone: SHARE_PHONE,
      message: 'Hello?',
    });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('ask_share_question requires message param', async () => {
    const { status, body } = await callBot('ask_share_question', {
      phone: SHARE_PHONE,
    });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });
});

// ─── Message Delivery (WhatsApp polling) ──────────────────────
describe('Bot API: Message delivery', () => {
  beforeEach(async () => {
    // Clean up any pending delivery messages
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `UPDATE messages SET whatsapp_delivered_at = datetime('now'), whatsapp_message = NULL
            WHERE whatsapp_message IS NOT NULL AND whatsapp_delivered_at IS NULL`,
      args: [],
    });
  });

  it('get_undelivered_messages requires auth', async () => {
    const noAuthRequest = new Request('http://localhost:3000/api/bot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'get_undelivered_messages', params: {} }),
    });
    const response = await POST(noAuthRequest as never);
    expect(response.status).toBe(401);
  });

  it('get_undelivered_messages returns pending messages', async () => {
    const { createMessage } = await import('@/lib/queries/messages');
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Bot delivery test',
      body: 'Test message for bot API.',
      whatsappMessage: 'Bot delivery test: Test message for bot API.',
      whatsappExpiresAt: expiresAt,
    });

    const { status, body } = await callBot('get_undelivered_messages', {});
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.messages.length).toBeGreaterThanOrEqual(1);
    expect(body.data.messages[0].phone).toBeTruthy();
    expect(body.data.messages[0].whatsapp_message).toBeTruthy();
    expect(body.data.messages[0].id).toBeTruthy();
  });

  it('get_undelivered_messages returns empty when none pending', async () => {
    const { status, body } = await callBot('get_undelivered_messages', {});
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.messages).toEqual([]);
  });

  it('mark_message_delivered marks message and returns delivered=true', async () => {
    const { createMessage } = await import('@/lib/queries/messages');
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Mark delivered test',
      body: 'Will be marked delivered.',
      whatsappMessage: 'Mark delivered test',
      whatsappExpiresAt: expiresAt,
    });

    const { status, body } = await callBot('mark_message_delivered', { message_id: msg.id });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.delivered).toBe(true);

    // Verify it's no longer in undelivered list
    const { body: body2 } = await callBot('get_undelivered_messages', {});
    const found = body2.data.messages.find((m: { id: string }) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  it('mark_message_delivered returns delivered=false for invalid id', async () => {
    const { status, body } = await callBot('mark_message_delivered', {
      message_id: 'non-existent-msg-id',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.delivered).toBe(false);
  });

  it('mark_message_delivered requires message_id', async () => {
    const { status, body } = await callBot('mark_message_delivered', {});
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('mark_message_delivered is idempotent (second call returns false)', async () => {
    const { createMessage } = await import('@/lib/queries/messages');
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Idempotent test',
      body: 'Test idempotency.',
      whatsappMessage: 'Idempotent test',
      whatsappExpiresAt: expiresAt,
    });

    const { body: body1 } = await callBot('mark_message_delivered', { message_id: msg.id });
    expect(body1.data.delivered).toBe(true);

    const { body: body2 } = await callBot('mark_message_delivered', { message_id: msg.id });
    expect(body2.data.delivered).toBe(false);
  });
});

// ─── Locale Validation Security Tests ─────────────────────────────────────

describe('Bot API: locale validation (security)', () => {
  it('identify with invalid language_code strips it (user gets en)', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900099',
      name: 'Invalid Lang User',
      language_code: 'xyz',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('en');
  });

  it('identify with path traversal language_code strips it', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900098',
      name: 'Traversal User',
      language_code: '../../etc',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('en');
  });

  it('identify with valid language_code accepts it', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900097',
      name: 'Valid Lang User',
      language_code: 'fr',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('fr');
  });

  it('set_language with unsupported code returns error', async () => {
    const { status, body } = await callBot('set_language', {
      phone: '+447700900001',
      language_code: 'xyz',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Unsupported language code');
  });

  it('set_language with valid code accepts it', async () => {
    const { status, body } = await callBot('set_language', {
      phone: '+447700900001',
      language_code: 'de',
    });
    expect(status).toBe(200);
    expect(body.data.user.language_code).toBe('de');
  });

  it('update_user with invalid language_code strips it (preserves existing)', async () => {
    // First set a known language
    await callBot('set_language', { phone: '+447700900001', language_code: 'es' });

    // Use a code within Zod max(10) but not a valid locale
    const { status, body } = await callBot('update_user', {
      phone: '+447700900001',
      language_code: 'zz',
    });
    expect(status).toBe(200);
    // language_code should not have been changed (invalid was stripped → undefined → no update)
    expect(body.data.user.language_code).toBe('es');
  });

  it('search_issues with invalid language_code falls back to en', async () => {
    const { status, body } = await callBot('search_issues', {
      query: 'Rail',
      language_code: 'zz',
    });
    expect(status).toBe(200);
    // Should return results without error (falls back to English)
    expect(body.data.issues.length).toBeGreaterThanOrEqual(1);
  });

  it('get_category_assistants with invalid language_code falls back via resolveLocale', async () => {
    const { status, body } = await callBot('get_category_assistants', {
      category: 'transport',
      language_code: 'zz-bad',
    });
    expect(status).toBe(200);
    expect(body.data.assistant).toBeDefined();
  });
});

// ─── Deploy a Chicken ──────────────────────────────────────

describe('Deploy a Chicken bot actions', () => {
  // Seed chicken data before chicken tests
  beforeAll(async () => {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: `INSERT OR IGNORE INTO chicken_pricing (id, country_code, currency, base_price_pence, distance_surcharge_pence, express_surcharge_pence, description)
            VALUES ('bot-pricing-gb', 'GB', 'GBP', 5000, 1000, 2500, 'UK chicken deployment')`,
      args: [],
    });
    await db.execute({
      sql: `INSERT OR IGNORE INTO chicken_fulfillers (id, name, city, country_code, radius_km)
            VALUES ('bot-fulfiller-1', 'Test Chicken', 'London', 'GB', 30)`,
      args: [],
    });
    // Give sarah enough funds for chicken deployments
    await db.execute({
      sql: "UPDATE wallets SET balance_pence = 50000 WHERE user_id = 'user-sarah'",
      args: [],
    });
  });

  it('get_chicken_pricing returns pricing', async () => {
    const { status, body } = await callBot('get_chicken_pricing', {});
    expect(status).toBe(200);
    expect(body.data.pricing).toBeDefined();
  });

  it('get_chicken_pricing by country', async () => {
    const { status, body } = await callBot('get_chicken_pricing', {
      country_code: 'GB',
    });
    expect(status).toBe(200);
    expect(body.data.pricing.country_code).toBe('GB');
  });

  it('deploy_chicken creates deployment', async () => {
    const { status, body } = await callBot('deploy_chicken', {
      phone: '+447700900001',
      target_name: 'Bot CEO Target',
      target_address: '123 Bot Street',
      target_city: 'London',
      target_country: 'GB',
      message_text: 'Fix the trains!',
    });
    expect(status).toBe(200);
    expect(body.data.deployment.status).toBe('paid');
    expect(body.data.deployment.target_name).toBe('Bot CEO Target');
    expect(body.data.amount_charged_pence).toBe(5000);
  });

  it('deploy_chicken with express delivery', async () => {
    const { status, body } = await callBot('deploy_chicken', {
      phone: '+447700900001',
      target_name: 'Express Target',
      target_address: '456 Fast Lane',
      target_city: 'London',
      target_country: 'GB',
      message_text: 'Urgent message!',
      express_delivery: true,
    });
    expect(status).toBe(200);
    expect(body.data.amount_charged_pence).toBe(7500); // 5000 + 2500
  });

  it('get_chicken_deployments returns user deployments', async () => {
    const { status, body } = await callBot('get_chicken_deployments', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    expect(body.data.deployments.length).toBeGreaterThan(0);
  });

  it('get_chicken_deployment returns specific deployment', async () => {
    const listRes = await callBot('get_chicken_deployments', {
      phone: '+447700900001',
    });
    const deploymentId = listRes.body.data.deployments[0].id;

    const { status, body } = await callBot('get_chicken_deployment', {
      phone: '+447700900001',
      deployment_id: deploymentId,
    });
    expect(status).toBe(200);
    expect(body.data.deployment.id).toBe(deploymentId);
  });

  it('cancel_chicken cancels a paid deployment', async () => {
    // Create a deployment to cancel
    const createRes = await callBot('deploy_chicken', {
      phone: '+447700900001',
      target_name: 'Cancel Bot Target',
      target_address: '789 Cancel Ave',
      target_city: 'London',
      target_country: 'GB',
      message_text: 'Will be cancelled',
    });
    const deploymentId = createRes.body.data.deployment.id;

    const { status, body } = await callBot('cancel_chicken', {
      phone: '+447700900001',
      deployment_id: deploymentId,
    });
    expect(status).toBe(200);
    expect(body.data.cancelled).toBe(true);
  });

  it('update_chicken_status updates status', async () => {
    const listRes = await callBot('get_chicken_deployments', {
      phone: '+447700900001',
    });
    const paidDeployment = listRes.body.data.deployments.find(
      (d: { status: string }) => d.status === 'paid',
    );
    if (!paidDeployment) return; // Skip if no paid deployment available

    const { status, body } = await callBot('update_chicken_status', {
      deployment_id: paidDeployment.id,
      status: 'accepted',
      fulfiller_id: 'bot-fulfiller-1',
    });
    expect(status).toBe(200);
    expect(body.data.deployment.status).toBe('accepted');
  });

  it('get_chicken_fulfillers returns fulfillers', async () => {
    const { status, body } = await callBot('get_chicken_fulfillers', {});
    expect(status).toBe(200);
    expect(body.data.fulfillers.length).toBeGreaterThan(0);
  });

  it('get_chicken_fulfillers filters by country', async () => {
    const { status, body } = await callBot('get_chicken_fulfillers', {
      country_code: 'GB',
    });
    expect(status).toBe(200);
    expect(body.data.fulfillers.length).toBeGreaterThan(0);
  });

  it('deploy_chicken fails with insufficient funds', async () => {
    // Drain the wallet first
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    await db.execute({
      sql: "UPDATE wallets SET balance_pence = 10 WHERE user_id = 'user-sarah'",
      args: [],
    });

    const { status, body } = await callBot('deploy_chicken', {
      phone: '+447700900001',
      target_name: 'No Funds Target',
      target_address: '000 Broke St',
      target_city: 'London',
      target_country: 'GB',
      message_text: 'Cannot afford',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Insufficient funds');

    // Restore wallet balance for other tests
    await db.execute({
      sql: "UPDATE wallets SET balance_pence = 50000 WHERE user_id = 'user-sarah'",
      args: [],
    });
  });
});

// ─── SafeUserProfile: identify must not leak PII ──────────────────────────

describe('Bot API: identify excludes sensitive fields (SafeUserProfile)', () => {
  it('does not return password_hash, email, phone, or session_version', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    const user = body.data.user;
    expect(user).toBeDefined();
    // Sensitive fields must not be present
    expect(user.password_hash).toBeUndefined();
    expect(user.email).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.session_version).toBeUndefined();
    expect(user.merged_into_user_id).toBeUndefined();
    expect(user.password_changed_at).toBeUndefined();
    // Safe fields should still be present
    expect(user.id).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.language_code).toBeDefined();
    expect(user.status).toBeDefined();
  });

  it('does not expose PII for newly created users either', async () => {
    const { status, body } = await callBot('identify', {
      phone: '+447700900555',
      name: 'PII Test User',
    });
    expect(status).toBe(200);
    const user = body.data.user;
    expect(user.password_hash).toBeUndefined();
    expect(user.email).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.session_version).toBeUndefined();
  });
});

// ─── Follow System ──────────────────────────────────
describe('follow_issue', () => {
  it('follows an active issue', async () => {
    const { status, body } = await callBot('follow_issue', {
      phone: '+5511999999999',
      issue_id: 'issue-broadband',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.followed).toBe(true);
    expect(body.data.user_id).toBe('user-marcio');
    expect(body.data.issue_id).toBe('issue-broadband');
  });

  it('returns 404 for non-existent user', async () => {
    const { status, body } = await callBot('follow_issue', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
    });
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it('returns 404 for non-existent issue', async () => {
    const { status, body } = await callBot('follow_issue', {
      phone: '+447700900001',
      issue_id: 'issue-nonexistent',
    });
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it('returns success for duplicate follow (idempotent)', async () => {
    await callBot('follow_issue', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
    });
    const { status, body } = await callBot('follow_issue', {
      phone: '+447700900001',
      issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.followed).toBe(true);
  });
});

describe('unfollow_issue', () => {
  it('unfollows a followed issue', async () => {
    // Follow first
    await callBot('follow_issue', {
      phone: '+5511999999999',
      issue_id: 'issue-flights',
    });
    // Then unfollow
    const { status, body } = await callBot('unfollow_issue', {
      phone: '+5511999999999',
      issue_id: 'issue-flights',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.unfollowed).toBe(true);
    expect(body.data.user_id).toBe('user-marcio');
    expect(body.data.issue_id).toBe('issue-flights');
  });

  it('returns 404 for non-existent user', async () => {
    const { status, body } = await callBot('unfollow_issue', {
      phone: '+19999999999',
      issue_id: 'issue-rail',
    });
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });
});

describe('get_followed_issues', () => {
  it('returns followed issues', async () => {
    // Follow an issue first
    await callBot('follow_issue', {
      phone: '+447700900001',
      issue_id: 'issue-broadband',
    });
    const { status, body } = await callBot('get_followed_issues', {
      phone: '+447700900001',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.issues)).toBe(true);
    expect(body.data.issues.some((i: { id: string }) => i.id === 'issue-broadband')).toBe(true);
  });

  it('returns 404 for non-existent user', async () => {
    const { status, body } = await callBot('get_followed_issues', {
      phone: '+19999999999',
    });
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });
});
