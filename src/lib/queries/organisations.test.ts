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
    const org = await getOrganisationById('org-southern');
    expect(org).not.toBeNull();
    expect(org!.name).toBe('Southern Rail');
    expect(org!.category).toBe('Transport');
  });

  it('returns null for missing organisation', async () => {
    const org = await getOrganisationById('nonexistent');
    expect(org).toBeNull();
  });
});

describe('getOrgsForIssue (Issue → Orgs pivot)', () => {
  it('returns orgs sorted by rioter_count DESC', async () => {
    const orgs = await getOrgsForIssue('issue-rail');
    expect(orgs).toHaveLength(2);
    expect(orgs[0].organisation_name).toBe('Southern Rail');
    expect(orgs[0].rioter_count).toBe(2847);
    expect(orgs[1].organisation_name).toBe('BT');
    expect(orgs[1].rioter_count).toBe(500);
  });

  it('returns empty array for issue with no orgs', async () => {
    const orgs = await getOrgsForIssue('nonexistent');
    expect(orgs).toHaveLength(0);
  });
});

describe('getIssuesForOrg (Org → Issues pivot)', () => {
  it('returns issues for Southern Rail', async () => {
    const issues = await getIssuesForOrg('org-southern');
    expect(issues).toHaveLength(2);
    // Sorted by rioter_count DESC
    expect(issues[0].issue_name).toBe('Rail Cancellations');
    expect(issues[1].issue_name).toBe('Flight Delays');
  });

  it('returns issues for BT', async () => {
    const issues = await getIssuesForOrg('org-bt');
    expect(issues).toHaveLength(2);
    expect(issues[0].issue_name).toBe('Broadband Speed');
    expect(issues[1].issue_name).toBe('Rail Cancellations');
  });
});

describe('getIssueCountForOrg', () => {
  it('returns correct count', async () => {
    const count = await getIssueCountForOrg('org-southern');
    expect(count).toBe(2);
  });

  it('returns 0 for unknown org', async () => {
    const count = await getIssueCountForOrg('nonexistent');
    expect(count).toBe(0);
  });
});

describe('getTotalRiotersForOrg', () => {
  it('returns sum of rioter_count across all issues', async () => {
    // Southern Rail: 2847 (Rail Cancellations) + 890 (Flight Delays) = 3737
    const total = await getTotalRiotersForOrg('org-southern');
    expect(total).toBe(3737);
  });

  it('returns 0 for unknown org', async () => {
    const total = await getTotalRiotersForOrg('nonexistent');
    expect(total).toBe(0);
  });
});

describe('getAllOrganisations with search', () => {
  it('filters by English name search', async () => {
    const orgs = await getAllOrganisations(undefined, 'Southern');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('filters by partial name match', async () => {
    const orgs = await getAllOrganisations(undefined, 'BT');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('BT');
  });

  it('combines category and search', async () => {
    const orgs = await getAllOrganisations('Transport', 'Southern');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('returns empty when search + category mismatch', async () => {
    const orgs = await getAllOrganisations('Banking', 'Southern');
    expect(orgs).toHaveLength(0);
  });

  it('returns empty for non-matching search', async () => {
    const orgs = await getAllOrganisations(undefined, 'nonexistent');
    expect(orgs).toHaveLength(0);
  });

  it('handles empty string search', async () => {
    const orgs = await getAllOrganisations(undefined, '');
    const allOrgs = await getAllOrganisations();
    expect(orgs.length).toBe(allOrgs.length);
  });

  it('handles whitespace-only search', async () => {
    const orgs = await getAllOrganisations(undefined, '   ');
    const allOrgs = await getAllOrganisations();
    expect(orgs.length).toBe(allOrgs.length);
  });
});

describe('getAllOrganisations with translation search', () => {
  // Test data translations:
  // org-southern → 'Kolej Południowa' (pl)
  // org-bt → 'BT Telekomunikacja' (pl)

  it('finds org by Polish translated name', async () => {
    const orgs = await getAllOrganisations(undefined, 'Południowa', 'pl');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('finds org by Polish translated name (partial)', async () => {
    const orgs = await getAllOrganisations(undefined, 'Telekomunikacja', 'pl');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('BT');
  });

  it('does not search translations when locale is en', async () => {
    const orgs = await getAllOrganisations(undefined, 'Południowa', 'en');
    expect(orgs).toHaveLength(0);
  });

  it('does not search translations when no locale provided', async () => {
    const orgs = await getAllOrganisations(undefined, 'Południowa');
    expect(orgs).toHaveLength(0);
  });

  it('still finds orgs by English name when non-English locale set', async () => {
    const orgs = await getAllOrganisations(undefined, 'Southern', 'pl');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('combines category + translation search', async () => {
    const orgs = await getAllOrganisations('Transport', 'Południowa', 'pl');
    expect(orgs).toHaveLength(1);
    expect(orgs[0].name).toBe('Southern Rail');
  });

  it('returns empty when translation search + category mismatch', async () => {
    const orgs = await getAllOrganisations('Banking', 'Południowa', 'pl');
    expect(orgs).toHaveLength(0);
  });

  it('escapes LIKE wildcards in translated org search', async () => {
    const orgs = await getAllOrganisations(undefined, '%', 'pl');
    const allOrgs = await getAllOrganisations();
    expect(orgs.length).toBeLessThan(allOrgs.length);
  });
});
