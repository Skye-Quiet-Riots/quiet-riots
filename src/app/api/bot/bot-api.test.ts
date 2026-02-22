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
      phone: '+0000000000',
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
      phone: '+0000000000',
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
      phone: '+0000000000',
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
      phone: '+0000000000',
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
      phone: '+0000000000',
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
    const { body: idBody } = await callBot('identify', {
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
    const { status } = await callBot('get_wallet', { phone: '+0000000000' });
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
      phone: '+0000000000',
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
