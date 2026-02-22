/**
 * Integration tests — full user journeys crossing multiple API routes.
 * These test realistic sequences of actions, not individual endpoints in isolation.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { createBotRequest } from '@/test/api-helpers';
import { _resetRateLimitStore } from '@/lib/rate-limit';
import { POST as botPost } from '@/app/api/bot/route';

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
  const response = await botPost(request);
  return { status: response.status, body: await response.json() };
}

describe('Integration: New user flow', () => {
  const phone = '+44700900001';

  it('identify → search → get_issue → join → verify', async () => {
    // Step 1: Identify (creates new user)
    const identify = await callBot('identify', { phone, name: 'Integration User' });
    expect(identify.status).toBe(200);
    expect(identify.body.data.user.phone).toBe(phone);
    expect(identify.body.data.user.name).toBe('Integration User');
    expect(identify.body.data.issues).toHaveLength(0);

    // Step 2: Search for issues
    const search = await callBot('search_issues', { query: 'rail' });
    expect(search.status).toBe(200);
    expect(search.body.data.issues.length).toBeGreaterThan(0);
    const railIssue = search.body.data.issues.find(
      (i: { name: string }) => i.name === 'Rail Cancellations',
    );
    expect(railIssue).toBeDefined();

    // Step 3: Get issue detail
    const detail = await callBot('get_issue', { issue_id: railIssue.id });
    expect(detail.status).toBe(200);
    expect(detail.body.data.issue.name).toBe('Rail Cancellations');
    expect(detail.body.data.health).toBeDefined();
    expect(detail.body.data.countries).toBeDefined();

    // Step 4: Join the issue
    const join = await callBot('join_issue', { phone, issue_id: railIssue.id });
    expect(join.status).toBe(200);
    expect(join.body.data.joined).toBe(true);

    // Step 5: Verify user now has the issue
    const verify = await callBot('identify', { phone });
    expect(verify.status).toBe(200);
    expect(verify.body.data.issues.length).toBeGreaterThan(0);
    const joinedIssue = verify.body.data.issues.find(
      (i: { issue_id: string }) => i.issue_id === railIssue.id,
    );
    expect(joinedIssue).toBeDefined();
  });
});

describe('Integration: Feed flow', () => {
  it('identify → join → post_feed → get_community → verify post', async () => {
    const phone = '+44700900002';

    // Step 1: Identify
    const identify = await callBot('identify', { phone, name: 'Feed User' });
    expect(identify.status).toBe(200);

    // Step 2: Join issue
    const join = await callBot('join_issue', { phone, issue_id: 'issue-broadband' });
    expect(join.status).toBe(200);

    // Step 3: Post to feed
    const post = await callBot('post_feed', {
      phone,
      issue_id: 'issue-broadband',
      content: 'Integration test post!',
    });
    expect(post.status).toBe(200);
    expect(post.body.data.post).toBeDefined();
    expect(post.body.data.post.content).toBe('Integration test post!');

    // Step 4: Get community and verify post appears
    const community = await callBot('get_community', { issue_id: 'issue-broadband' });
    expect(community.status).toBe(200);
    const feedPosts = community.body.data.feed;
    const ourPost = feedPosts.find(
      (p: { content: string }) => p.content === 'Integration test post!',
    );
    expect(ourPost).toBeDefined();
  });
});

describe('Integration: Bot full cycle', () => {
  it('identify → search → get_issue → join → post_feed → get_community', async () => {
    const phone = '+44700900003';

    // Identify
    const identify = await callBot('identify', { phone, name: 'Cycle User' });
    expect(identify.status).toBe(200);

    // Search
    const search = await callBot('search_issues', { query: 'broadband' });
    expect(search.status).toBe(200);
    const issue = search.body.data.issues[0];
    expect(issue).toBeDefined();

    // Get issue detail
    const detail = await callBot('get_issue', { issue_id: issue.id });
    expect(detail.status).toBe(200);
    expect(detail.body.data.seasonalPattern).toBeDefined();
    expect(detail.body.data.relatedIssues).toBeDefined();

    // Join
    const join = await callBot('join_issue', { phone, issue_id: issue.id });
    expect(join.status).toBe(200);

    // Post feed
    const post = await callBot('post_feed', {
      phone,
      issue_id: issue.id,
      content: 'Full cycle test',
    });
    expect(post.status).toBe(200);

    // Get community
    const community = await callBot('get_community', { issue_id: issue.id });
    expect(community.status).toBe(200);
    expect(community.body.data.health).toBeDefined();
    expect(community.body.data.experts).toBeDefined();
    expect(community.body.data.countries).toBeDefined();
  });
});

describe('Integration: Edge cases', () => {
  it('joining same issue twice is idempotent', async () => {
    const phone = '+5511999999999'; // existing user Marcio
    const issueId = 'issue-rail'; // already joined in seed

    // Join again — should succeed silently (INSERT OR IGNORE)
    const join1 = await callBot('join_issue', { phone, issue_id: issueId });
    expect(join1.status).toBe(200);
    expect(join1.body.data.joined).toBe(true);

    const join2 = await callBot('join_issue', { phone, issue_id: issueId });
    expect(join2.status).toBe(200);
    expect(join2.body.data.joined).toBe(true);
  });

  it('leaving an issue not joined is safe', async () => {
    const phone = '+5511999999999'; // Marcio
    const issueId = 'issue-flights'; // not joined

    const leave = await callBot('leave_issue', { phone, issue_id: issueId });
    expect(leave.status).toBe(200);
    expect(leave.body.data.left).toBe(true);
  });

  it('operations fail for unknown user', async () => {
    const phone = '+44000000000';

    const join = await callBot('join_issue', { phone, issue_id: 'issue-rail' });
    expect(join.status).toBe(404);
    expect(join.body.error).toContain('User not found');

    const post = await callBot('post_feed', {
      phone,
      issue_id: 'issue-rail',
      content: 'ghost post',
    });
    expect(post.status).toBe(404);
    expect(post.body.error).toContain('User not found');
  });

  it('riot reel submission via bot creates pending reel', async () => {
    const phone = '+44700900004';
    await callBot('identify', { phone, name: 'Reel User' });

    const submit = await callBot('submit_riot_reel', {
      phone,
      issue_id: 'issue-rail',
      youtube_url: 'https://www.youtube.com/watch?v=integ_reel1',
      caption: 'Integration test reel',
    });
    expect(submit.status).toBe(200);
    expect(submit.body.data.reel.status).toBe('pending');
    expect(submit.body.data.reel.youtube_video_id).toBe('integ_reel1');
  });

  it('get_riot_reel returns reel and logs it as shown', async () => {
    const phone = '+44700900005';
    await callBot('identify', { phone, name: 'Viewer User' });

    // Get a reel for broadband (has 1 featured reel in seed)
    const first = await callBot('get_riot_reel', {
      phone,
      issue_id: 'issue-broadband',
    });
    expect(first.status).toBe(200);
    expect(first.body.data.reel).not.toBeNull();
    expect(first.body.data.reel.issue_id).toBe('issue-broadband');

    // Second call — all reels shown, should return null
    const second = await callBot('get_riot_reel', {
      phone,
      issue_id: 'issue-broadband',
    });
    expect(second.status).toBe(200);
    expect(second.body.data.reel).toBeNull();
  });

  it('error responses include error codes', async () => {
    // 401 Unauthorized
    const noAuth = new Request('http://localhost:3000/api/bot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'get_trending', params: {} }),
    });
    const authResp = await botPost(noAuth as never);
    const authBody = await authResp.json();
    expect(authBody.code).toBe('UNAUTHORIZED');

    // 404 Not Found
    const notFound = await callBot('get_issue', { issue_id: 'nonexistent' });
    expect(notFound.body.code).toBe('NOT_FOUND');

    // Validation error
    const invalid = await callBot('create_issue', { name: '', category: 'InvalidCat' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('Integration: Wallet flow', () => {
  it('identify → topup → verify balance → contribute → verify deducted', async () => {
    const phone = '+44700900010';

    // Step 1: Identify (creates user)
    const identify = await callBot('identify', { phone, name: 'Wallet User' });
    expect(identify.status).toBe(200);

    // Step 2: Check wallet starts at zero
    const walletBefore = await callBot('get_wallet', { phone });
    expect(walletBefore.status).toBe(200);
    expect(walletBefore.body.data.wallet.balance_pence).toBe(0);

    // Step 3: Top up £10
    const topup = await callBot('topup_wallet', { phone, amount_pence: 1000 });
    expect(topup.status).toBe(200);
    expect(topup.body.data.wallet.balance_pence).toBe(1000);

    // Step 4: Verify balance updated
    const walletAfter = await callBot('get_wallet', { phone });
    expect(walletAfter.status).toBe(200);
    expect(walletAfter.body.data.wallet.balance_pence).toBe(1000);
    expect(walletAfter.body.data.wallet.total_loaded_pence).toBe(1000);

    // Step 5: Contribute to a campaign
    const contribute = await callBot('contribute', {
      phone,
      campaign_id: 'camp-water-test',
      amount_pence: 300,
    });
    expect(contribute.status).toBe(200);
    expect(contribute.body.data.transaction.type).toBe('contribute');
    expect(contribute.body.data.wallet_balance_pence).toBe(700);

    // Step 6: Verify final wallet state
    const walletFinal = await callBot('get_wallet', { phone });
    expect(walletFinal.status).toBe(200);
    expect(walletFinal.body.data.wallet.balance_pence).toBe(700);
    expect(walletFinal.body.data.wallet.total_spent_pence).toBe(300);
    expect(walletFinal.body.data.summary.totalSpent).toBe(300);
    expect(walletFinal.body.data.summary.issuesSupported).toBe(1);
  });

  it('contribute fails with insufficient funds', async () => {
    const phone = '+44700900011';
    await callBot('identify', { phone, name: 'Broke User' });

    // Top up a small amount so wallet exists, then try to spend more
    await callBot('topup_wallet', { phone, amount_pence: 100 });

    const contribute = await callBot('contribute', {
      phone,
      campaign_id: 'camp-water-test',
      amount_pence: 5000,
    });
    expect(contribute.status).toBe(400);
    expect(contribute.body.error).toContain('Insufficient funds');
  });

  it('contribute fails for inactive campaign', async () => {
    const phone = '+44700900012';
    await callBot('identify', { phone, name: 'Funded Campaign User' });

    // Top up first
    const topup = await callBot('topup_wallet', { phone, amount_pence: 500 });
    expect(topup.status).toBe(200);

    // Try to contribute to a funded (inactive) campaign
    const contribute = await callBot('contribute', {
      phone,
      campaign_id: 'camp-funded',
      amount_pence: 100,
    });
    expect(contribute.status).toBe(400);
    expect(contribute.body.error).toContain('not active');
  });
});
