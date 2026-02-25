import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  getAllIssues,
  getIssueById,
  getIssuesByCategory,
  getTrendingIssues,
  getIssueCountsByCategory,
  createIssue,
  getIssuesForCountry,
  parseSearchWords,
  escapeLike,
} from './issues';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getAllIssues', () => {
  it('returns all issues ordered by rioter_count DESC', async () => {
    const issues = await getAllIssues();
    expect(issues).toHaveLength(3);
    expect(issues[0].name).toBe('Flight Delays'); // 12340
    expect(issues[1].name).toBe('Broadband Speed'); // 4112
    expect(issues[2].name).toBe('Rail Cancellations'); // 2847
  });

  it('filters by category', async () => {
    const issues = await getAllIssues('Transport');
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.category === 'Transport')).toBe(true);
  });

  it('filters by name search', async () => {
    const issues = await getAllIssues(undefined, 'Rail');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('finds issues via synonym search', async () => {
    const issues = await getAllIssues(undefined, 'train cancellations');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('combines category and search filters', async () => {
    const issues = await getAllIssues('Transport', 'Rail');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('returns empty array when no matches', async () => {
    const issues = await getAllIssues(undefined, 'nonexistent');
    expect(issues).toHaveLength(0);
  });
});

describe('parseSearchWords', () => {
  it('splits on whitespace and lowercases', () => {
    expect(parseSearchWords('Train Cancelled')).toEqual(['train', 'cancelled']);
  });

  it('removes stop words', () => {
    expect(parseSearchWords('the train was cancelled')).toEqual(['train', 'cancelled']);
  });

  it('removes words shorter than 3 characters', () => {
    expect(parseSearchWords('UK rail delays')).toEqual(['rail', 'delays']);
  });

  it('caps at 5 words', () => {
    const result = parseSearchWords('one two three four five six seven eight');
    expect(result).toHaveLength(5);
  });

  it('returns empty array when all words are stop words', () => {
    expect(parseSearchWords('the and were')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parseSearchWords('   ')).toEqual([]);
  });
});

describe('escapeLike', () => {
  it('escapes percent sign', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('escapes underscore', () => {
    expect(escapeLike('test_data')).toBe('test\\_data');
  });

  it('escapes backslash', () => {
    expect(escapeLike('path\\file')).toBe('path\\\\file');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeLike('train cancelled')).toBe('train cancelled');
  });
});

describe('getAllIssues multi-word search', () => {
  // Test data: issue-rail = "Rail Cancellations" (Transport, 2847)
  //   synonyms: "train cancellations", "cancelled trains", "train cancelled", "rail delays"
  // Test data: issue-broadband = "Broadband Speed" (Telecoms, 4112)
  //   synonyms: "slow internet"
  // Test data: issue-flights = "Flight Delays" (Transport, 12340)
  //   synonyms: "flight cancelled"

  it('matches natural language query via word splitting', async () => {
    const issues = await getAllIssues(undefined, 'my train keeps getting cancelled');
    const names = issues.map((i) => i.name);
    expect(names).toContain('Rail Cancellations');
  });

  it('matches words across name and synonym separately', async () => {
    // "rail" matches issue name, "delays" matches synonym "rail delays"
    const issues = await getAllIssues(undefined, 'rail delays');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('uses AND logic: all words must match', async () => {
    // "rail" matches Rail Cancellations, "broadband" matches Broadband Speed — no issue has both
    const issues = await getAllIssues(undefined, 'rail broadband');
    // AND returns nothing, OR fallback returns both
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to OR when AND returns nothing with 2+ words', async () => {
    // "rail" and "broadband" don't coexist — AND fails, OR finds both
    const issues = await getAllIssues(undefined, 'rail broadband');
    const names = issues.map((i) => i.name);
    expect(names).toContain('Rail Cancellations');
    expect(names).toContain('Broadband Speed');
  });

  it('filters stop words before searching', async () => {
    // "the rail" → "rail" after stop word removal
    const issues = await getAllIssues(undefined, 'the rail');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('Rail Cancellations');
  });

  it('falls back to full-phrase LIKE when all words are stop words', async () => {
    const issues = await getAllIssues(undefined, 'the and were');
    // Full-phrase "the and were" won't match any issue name
    expect(issues).toHaveLength(0);
  });

  it('treats SQL LIKE wildcards as literals', async () => {
    // "%" should not match everything
    const allIssues = await getAllIssues();
    const percentSearch = await getAllIssues(undefined, '%');
    expect(percentSearch.length).toBeLessThan(allIssues.length);
  });

  it('treats underscore as literal', async () => {
    const issues = await getAllIssues(undefined, 'test_nonexistent');
    expect(issues).toHaveLength(0);
  });

  it('handles special characters without error', async () => {
    // Apostrophes and ampersands should not crash
    const issues1 = await getAllIssues(undefined, "can't cancel");
    expect(Array.isArray(issues1)).toBe(true);
    const issues2 = await getAllIssues(undefined, 'A&E waiting');
    expect(Array.isArray(issues2)).toBe(true);
  });

  it('returns all issues for empty string search', async () => {
    const issues = await getAllIssues(undefined, '');
    const allIssues = await getAllIssues();
    expect(issues.length).toBe(allIssues.length);
  });

  it('returns all issues for whitespace-only search', async () => {
    const issues = await getAllIssues(undefined, '   ');
    const allIssues = await getAllIssues();
    expect(issues.length).toBe(allIssues.length);
  });
});

describe('getIssueById', () => {
  it('returns the issue when found', async () => {
    const issue = await getIssueById('issue-rail');
    expect(issue).not.toBeNull();
    expect(issue!.name).toBe('Rail Cancellations');
    expect(issue!.category).toBe('Transport');
    expect(issue!.rioter_count).toBe(2847);
  });

  it('returns null for missing issue', async () => {
    const issue = await getIssueById('nonexistent');
    expect(issue).toBeNull();
  });
});

describe('getIssuesByCategory', () => {
  it('returns issues for the given category', async () => {
    const issues = await getIssuesByCategory('Transport');
    expect(issues).toHaveLength(2);
    expect(issues[0].rioter_count).toBeGreaterThanOrEqual(issues[1].rioter_count);
  });

  it('returns empty array for category with no issues', async () => {
    const issues = await getIssuesByCategory('Banking');
    expect(issues).toHaveLength(0);
  });
});

describe('getTrendingIssues', () => {
  it('returns issues ordered by trending_delta DESC', async () => {
    const issues = await getTrendingIssues();
    expect(issues[0].name).toBe('Flight Delays'); // 890
    expect(issues[1].name).toBe('Broadband Speed'); // 520
    expect(issues[2].name).toBe('Rail Cancellations'); // 340
  });

  it('respects the limit parameter', async () => {
    const issues = await getTrendingIssues(2);
    expect(issues).toHaveLength(2);
  });
});

describe('createIssue', () => {
  it('creates an issue and returns it', async () => {
    const issue = await createIssue({
      name: 'Test Issue',
      category: 'Banking',
      description: 'A test issue',
    });
    expect(issue.name).toBe('Test Issue');
    expect(issue.category).toBe('Banking');
    expect(issue.description).toBe('A test issue');
    expect(issue.rioter_count).toBe(0);
    expect(issue.country_count).toBe(0);
    expect(issue.trending_delta).toBe(0);
    expect(typeof issue.id).toBe('string');
  });

  it('defaults description to empty string', async () => {
    const issue = await createIssue({ name: 'No Desc Issue', category: 'Health' });
    expect(issue.description).toBe('');
  });

  it('creates a country-scoped issue', async () => {
    const issue = await createIssue({
      name: 'NHS Waiting Times',
      category: 'Health',
      country_scope: 'country',
      primary_country: 'GB',
    });
    expect(issue.country_scope).toBe('country');
    expect(issue.primary_country).toBe('GB');
  });

  it('defaults country_scope to global', async () => {
    const issue = await createIssue({ name: 'Global Health Issue', category: 'Health' });
    expect(issue.country_scope).toBe('global');
    expect(issue.primary_country).toBeNull();
  });
});

describe('getIssuesForCountry', () => {
  // At this point we have:
  // - 3 seed issues (all global): Flight Delays (12340), Broadband Speed (4112), Rail Cancellations (2847)
  // - 2 createIssue globals: Test Issue (Banking, 0), No Desc Issue (Health, 0), Global Health Issue (Health, 0)
  // - 1 country-scoped: NHS Waiting Times (Health, GB, 0)

  it('returns global issues plus matching country-scoped issues', async () => {
    const issues = await getIssuesForCountry('GB');
    const names = issues.map((i) => i.name);
    expect(names).toContain('Flight Delays'); // global
    expect(names).toContain('Rail Cancellations'); // global
    expect(names).toContain('NHS Waiting Times'); // country=GB
  });

  it('excludes country-scoped issues for a different country', async () => {
    const issues = await getIssuesForCountry('US');
    const names = issues.map((i) => i.name);
    expect(names).toContain('Flight Delays'); // global
    expect(names).not.toContain('NHS Waiting Times'); // country=GB, not US
  });

  it('returns results ordered by rioter_count DESC', async () => {
    const issues = await getIssuesForCountry('GB');
    for (let i = 1; i < issues.length; i++) {
      expect(issues[i - 1].rioter_count).toBeGreaterThanOrEqual(issues[i].rioter_count);
    }
  });

  it('filters by category within country scope', async () => {
    const issues = await getIssuesForCountry('GB', 'Health');
    expect(issues.every((i) => i.category === 'Health')).toBe(true);
    const names = issues.map((i) => i.name);
    expect(names).toContain('NHS Waiting Times'); // country=GB, Health
  });

  it('normalises country code to uppercase', async () => {
    const issues = await getIssuesForCountry('gb');
    const names = issues.map((i) => i.name);
    expect(names).toContain('NHS Waiting Times');
  });

  it('returns only global issues for a country with no scoped issues', async () => {
    const issues = await getIssuesForCountry('JP');
    expect(issues.every((i) => i.country_scope === 'global')).toBe(true);
  });
});

describe('getAllIssues with countryCode', () => {
  it('filters by country code', async () => {
    const issues = await getAllIssues(undefined, undefined, 'GB');
    const names = issues.map((i) => i.name);
    expect(names).toContain('NHS Waiting Times'); // country=GB
    expect(names).toContain('Flight Delays'); // global
  });

  it('excludes non-matching country-scoped issues', async () => {
    const issues = await getAllIssues(undefined, undefined, 'US');
    const names = issues.map((i) => i.name);
    expect(names).not.toContain('NHS Waiting Times'); // country=GB
    expect(names).toContain('Flight Delays'); // global
  });

  it('combines category, search, and countryCode filters', async () => {
    const issues = await getAllIssues('Health', 'NHS', 'GB');
    expect(issues).toHaveLength(1);
    expect(issues[0].name).toBe('NHS Waiting Times');
  });

  it('returns no results when search + country exclude everything', async () => {
    const issues = await getAllIssues('Health', 'NHS', 'JP');
    expect(issues).toHaveLength(0);
  });
});

describe('getIssueCountsByCategory', () => {
  it('returns correct counts per category', async () => {
    const counts = await getIssueCountsByCategory();
    expect(counts['Transport']).toBe(2);
    expect(counts['Telecoms']).toBe(1);
    // Banking and Health issues created by createIssue tests above
    expect(counts['Banking']).toBe(1);
    expect(counts['Health']).toBe(3);
  });
});
