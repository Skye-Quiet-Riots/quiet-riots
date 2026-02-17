import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createBotRequest } from '@/test/api-helpers';
import { POST } from './route';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
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
    const { status, body } = await callBot('get_issue', { issue_id: 1 });
    expect(status).toBe(200);
    expect(body.data.issue.name).toBe('Rail Cancellations');
    expect(body.data.health).not.toBeNull();
    expect(body.data.countries).toBeDefined();
    expect(body.data.pivotOrgs).toBeDefined();
    expect(body.data.actionCount).toBeDefined();
    expect(body.data.synonyms).toBeDefined();
  });

  it('returns 404 for missing issue', async () => {
    const { status } = await callBot('get_issue', { issue_id: 999 });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_actions', () => {
  it('returns actions for an issue', async () => {
    const { status, body } = await callBot('get_actions', { issue_id: 1 });
    expect(status).toBe(200);
    expect(body.data.actions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Bot API: get_community', () => {
  it('returns community data with parallel queries', async () => {
    const { status, body } = await callBot('get_community', { issue_id: 1 });
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
      issue_id: 2,
    });
    expect(status).toBe(200);
    expect(body.data.joined).toBe(true);
  });

  it('leaves an issue', async () => {
    const { status, body } = await callBot('leave_issue', {
      phone: '+5511999999999',
      issue_id: 2,
    });
    expect(status).toBe(200);
    expect(body.data.left).toBe(true);
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('join_issue', {
      phone: '+0000000000',
      issue_id: 1,
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: post_feed', () => {
  it('creates a feed post', async () => {
    const { status, body } = await callBot('post_feed', {
      phone: '+5511999999999',
      issue_id: 1,
      content: 'Hello from the bot!',
    });
    expect(status).toBe(200);
    expect(body.data.post.content).toBe('Hello from the bot!');
  });

  it('fails for unknown user', async () => {
    const { status } = await callBot('post_feed', {
      phone: '+0000000000',
      issue_id: 1,
      content: 'test',
    });
    expect(status).toBe(404);
  });
});

describe('Bot API: get_org_pivot', () => {
  it('returns org with issues and totalRioters', async () => {
    const { status, body } = await callBot('get_org_pivot', { org_id: 1 });
    expect(status).toBe(200);
    expect(body.data.org.name).toBe('Southern Rail');
    expect(body.data.issues).toBeDefined();
    expect(body.data.totalRioters).toBeDefined();
  });

  it('returns 404 for missing org', async () => {
    const { status } = await callBot('get_org_pivot', { org_id: 999 });
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
      issue_id: 1,
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
