import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getCampaigns, getCampaignById, createCampaign, getCampaignsForIssue } from './campaigns';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getCampaigns', () => {
  it('returns all campaigns when no filters', async () => {
    const campaigns = await getCampaigns();
    expect(campaigns.length).toBe(3);
  });

  it('filters by issue_id', async () => {
    const campaigns = await getCampaigns('issue-rail');
    expect(campaigns.length).toBe(2);
    expect(campaigns.every((c) => c.issue_id === 'issue-rail')).toBe(true);
  });

  it('filters by status', async () => {
    const active = await getCampaigns(undefined, 'active');
    expect(active.every((c) => c.status === 'active')).toBe(true);

    const funded = await getCampaigns(undefined, 'funded');
    expect(funded.length).toBe(1);
    expect(funded[0].id).toBe('camp-funded');
  });

  it('filters by both issue_id and status', async () => {
    const campaigns = await getCampaigns('issue-rail', 'active');
    expect(campaigns.every((c) => c.issue_id === 'issue-rail' && c.status === 'active')).toBe(true);
  });
});

describe('getCampaignById', () => {
  it('returns campaign by id', async () => {
    const campaign = await getCampaignById('camp-water-test');
    expect(campaign).not.toBeNull();
    expect(campaign!.title).toBe('Rail Legal Review');
    expect(campaign!.target_pence).toBe(100000);
  });

  it('returns null for non-existent id', async () => {
    const campaign = await getCampaignById('nonexistent');
    expect(campaign).toBeNull();
  });
});

describe('createCampaign', () => {
  it('creates a campaign with correct defaults', async () => {
    const campaign = await createCampaign({
      issueId: 'issue-broadband',
      title: 'Test Campaign',
      description: 'A test campaign',
      targetPence: 50000,
      recipient: 'Test Org',
    });
    expect(campaign.title).toBe('Test Campaign');
    expect(campaign.target_pence).toBe(50000);
    expect(campaign.raised_pence).toBe(0);
    expect(campaign.contributor_count).toBe(0);
    expect(campaign.status).toBe('active');
    expect(campaign.platform_fee_pct).toBe(15);
  });

  it('allows custom platform fee', async () => {
    const campaign = await createCampaign({
      issueId: 'issue-rail',
      title: 'Low Fee Campaign',
      targetPence: 25000,
      platformFeePct: 10,
    });
    expect(campaign.platform_fee_pct).toBe(10);
  });
});

describe('getCampaignsForIssue', () => {
  it('returns only active campaigns for an issue', async () => {
    const campaigns = await getCampaignsForIssue('issue-broadband');
    // camp-funded is funded, not active; the new 'Test Campaign' we created above should appear
    expect(campaigns.every((c) => c.status === 'active')).toBe(true);
  });

  it('returns empty for issue with no active campaigns', async () => {
    const campaigns = await getCampaignsForIssue('issue-flights');
    expect(campaigns.length).toBe(0);
  });
});
