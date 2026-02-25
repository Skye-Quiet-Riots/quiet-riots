import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createBotRequest } from '@/test/api-helpers';
import { POST } from './route';
import { _resetRateLimitStore } from '@/lib/rate-limit';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  _resetRateLimitStore();
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
    expect(body.data.user.phone).toBe('+447700900000');
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

  it('returns 404 for missing org', async () => {
    const { status } = await callBot('get_org_pivot', { org_id: 'nonexistent' });
    expect(status).toBe(404);
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

describe('Bot API: create_issue', () => {
  it('creates a new issue', async () => {
    const { status, body } = await callBot('create_issue', {
      name: 'Water Quality',
      category: 'Environment',
      description: 'Poor water quality in rural areas',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.issue.name).toBe('Water Quality');
    expect(body.data.issue.category).toBe('Environment');
    expect(body.data.issue.description).toBe('Poor water quality in rural areas');
    expect(body.data.issue.rioter_count).toBe(0);
  });

  it('creates issue with defaults when no description', async () => {
    const { status, body } = await callBot('create_issue', {
      name: 'School Funding',
      category: 'Education',
    });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('School Funding');
    expect(body.data.issue.description).toBe('');
  });

  it('fails without name', async () => {
    const { status, body } = await callBot('create_issue', {
      category: 'Health',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('name');
  });

  it('fails with invalid category', async () => {
    const { status, body } = await callBot('create_issue', {
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

describe('Bot API: contribute', () => {
  it('deducts from wallet and credits campaign', async () => {
    // Sarah has wallet with £5 balance (seeded) — contribute 10p
    const { status, body } = await callBot('contribute', {
      phone: '+447700900001', // Sarah
      campaign_id: 'camp-water-test',
      amount_pence: 10,
    });
    expect(status).toBe(200);
    expect(body.data.transaction.amount_pence).toBe(10);
    expect(body.data.campaign).toBeDefined();
  });

  it('returns error for non-existent campaign', async () => {
    const { status, body } = await callBot('contribute', {
      phone: '+5511999999999',
      campaign_id: 'camp-nonexistent',
      amount_pence: 100,
    });
    expect(status).toBe(404);
    expect(body.error).toContain('Campaign not found');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('contribute', {
      phone: '+19999999999',
      campaign_id: 'camp-water-test',
      amount_pence: 100,
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_campaigns', () => {
  it('returns all campaigns', async () => {
    const { status, body } = await callBot('get_campaigns', {});
    expect(status).toBe(200);
    expect(body.data.campaigns.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by issue_id', async () => {
    const { status, body } = await callBot('get_campaigns', {
      issue_id: 'issue-rail',
    });
    expect(status).toBe(200);
    expect(
      body.data.campaigns.every((c: { issue_id: string }) => c.issue_id === 'issue-rail'),
    ).toBe(true);
  });

  it('filters by status', async () => {
    const { status, body } = await callBot('get_campaigns', {
      status: 'funded',
    });
    expect(status).toBe(200);
    expect(body.data.campaigns.every((c: { status: string }) => c.status === 'funded')).toBe(true);
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
      ['campaign', 'camp-water-test', 'title', 'pl', 'Przegląd prawny kolei'],
      [
        'campaign',
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

  it('get_campaigns returns translated campaign titles', async () => {
    const { status, body } = await callBot('get_campaigns', {
      issue_id: 'issue-rail',
      language_code: 'pl',
    });
    expect(status).toBe(200);
    const camp = body.data.campaigns.find((c: { id: string }) => c.id === 'camp-water-test');
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

  // ─── Structural guard: all data-fetching actions must accept language_code ───
  // If you add a new action that returns translatable data (issues, orgs, campaigns),
  // add it to this list. The test will fail if the action rejects language_code.

  const DATA_FETCHING_ACTIONS: { action: string; minParams: Record<string, unknown> }[] = [
    { action: 'search_issues', minParams: { query: 'test' } },
    { action: 'get_trending', minParams: {} },
    { action: 'get_issue', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_actions', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_community', minParams: { issue_id: 'issue-rail' } },
    { action: 'get_org_pivot', minParams: { org_id: 'org-southern' } },
    { action: 'get_orgs', minParams: {} },
    { action: 'get_campaigns', minParams: {} },
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
