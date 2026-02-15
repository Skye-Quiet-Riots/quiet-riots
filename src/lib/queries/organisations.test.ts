import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getAllOrganisations,
  getOrganisationById,
  getOrgsForIssue,
  getIssuesForOrg,
  getIssueCountForOrg,
  getTotalRiotersForOrg,
} from './organisations';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getAllOrganisations', () => {
  it('returns all organisations ordered by name', async () => {
    const orgs = await getAllOrganisations();
    expect(orgs).toHaveLength(2);
    expect(orgs[0].name).toBe('BT');
    expect(orgs[1].name).toBe('Southern Rail');
  });

  it('filters by category', async () => {
    const orgs = await getAllOrganisations('Transport');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('returns empty array for category with no orgs', async () => {
    const orgs = await getAllOrganisations('Banking');
    expect(orgs).toHaveLength(0);
  });
});

describe('getOrganisationById', () => {
  it('returns the organisation when found', async () => {
    const org = await getOrganisationById(1);
    expect(org).not.toBeNull();
    expect(org!.name).toBe('Southern Rail');
    expect(org!.category).toBe('Transport');
  });

  it('returns null for missing organisation', async () => {
    const org = await getOrganisationById(999);
    expect(org).toBeNull();
  });
});

describe('getOrgsForIssue (Issue → Orgs pivot)', () => {
  it('returns orgs sorted by rioter_count DESC', async () => {
    const orgs = await getOrgsForIssue(1);
    expect(orgs).toHaveLength(2);
    expect(orgs[0].organisation_name).toBe('Southern Rail');
    expect(orgs[0].rioter_count).toBe(2847);
    expect(orgs[1].organisation_name).toBe('BT');
    expect(orgs[1].rioter_count).toBe(500);
  });

  it('returns empty array for issue with no orgs', async () => {
    const orgs = await getOrgsForIssue(999);
    expect(orgs).toHaveLength(0);
  });
});

describe('getIssuesForOrg (Org → Issues pivot)', () => {
  it('returns issues for Southern Rail', async () => {
    const issues = await getIssuesForOrg(1);
    expect(issues).toHaveLength(2);
    // Sorted by rioter_count DESC
    expect(issues[0].issue_name).toBe('Rail Cancellations');
    expect(issues[1].issue_name).toBe('Flight Delays');
  });

  it('returns issues for BT', async () => {
    const issues = await getIssuesForOrg(2);
    expect(issues).toHaveLength(2);
    expect(issues[0].issue_name).toBe('Broadband Speed');
    expect(issues[1].issue_name).toBe('Rail Cancellations');
  });
});

describe('getIssueCountForOrg', () => {
  it('returns correct count', async () => {
    const count = await getIssueCountForOrg(1);
    expect(count).toBe(2);
  });

  it('returns 0 for unknown org', async () => {
    const count = await getIssueCountForOrg(999);
    expect(count).toBe(0);
  });
});

describe('getTotalRiotersForOrg', () => {
  it('returns sum of rioter_count across all issues', async () => {
    // Southern Rail: 2847 (Rail Cancellations) + 890 (Flight Delays) = 3737
    const total = await getTotalRiotersForOrg(1);
    expect(total).toBe(3737);
  });

  it('returns 0 for unknown org', async () => {
    const total = await getTotalRiotersForOrg(999);
    expect(total).toBe(0);
  });
});
