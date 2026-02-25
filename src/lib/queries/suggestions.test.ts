import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  createSuggestion,
  getSuggestionById,
  getSuggestionsByUser,
  getSuggestionsByStatus,
  approveSuggestion,
  rejectSuggestion,
  mergeSuggestion,
  requestMoreInfo,
  markTranslationsReady,
  goLiveSuggestion,
  setPublicRecognition,
  setFirstRioterNotified,
  getCloseMatches,
} from './suggestions';
import { getIssueById } from './issues';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('createSuggestion', () => {
  it('creates a new issue suggestion', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-sarah',
      originalText: 'energy prices are ridiculous',
      suggestedName: 'Energy Prices',
      suggestedType: 'issue',
      category: 'Energy',
      description: 'Rising energy bills',
    });
    expect(suggestion.id).toBeTruthy();
    expect(suggestion.suggested_by).toBe('user-sarah');
    expect(suggestion.original_text).toBe('energy prices are ridiculous');
    expect(suggestion.suggested_name).toBe('Energy Prices');
    expect(suggestion.suggested_type).toBe('issue');
    expect(suggestion.category).toBe('Energy');
    expect(suggestion.status).toBe('pending_review');
    expect(suggestion.public_recognition).toBe(1);
    expect(suggestion.first_rioter_notified).toBe(0);
  });

  it('creates an organisation suggestion', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-marcio',
      originalText: 'sky broadband is terrible',
      suggestedName: 'Sky Broadband',
      suggestedType: 'organisation',
      category: 'Telecoms',
    });
    expect(suggestion.suggested_type).toBe('organisation');
    expect(suggestion.category).toBe('Telecoms');
  });

  it('stores close match IDs as JSON', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'train delays are awful',
      suggestedName: 'Train Delays',
      suggestedType: 'issue',
      category: 'Transport',
      closeMatchIds: ['issue-rail', 'issue-flights'],
    });
    expect(suggestion.close_match_ids).toBe('["issue-rail","issue-flights"]');
  });

  it('respects public_recognition setting', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'anonymous suggestion',
      suggestedName: 'Anonymous Test',
      suggestedType: 'issue',
      category: 'Other',
      publicRecognition: 0,
    });
    expect(suggestion.public_recognition).toBe(0);
  });
});

describe('getSuggestionById', () => {
  it('returns a suggestion by id', async () => {
    const suggestion = await getSuggestionById('suggestion-mobile');
    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggested_name).toBe('Mobile Data Costs');
    expect(suggestion!.status).toBe('pending_review');
    expect(suggestion!.issue_id).toBe('issue-mobile-data');
  });

  it('returns null for non-existent id', async () => {
    const suggestion = await getSuggestionById('does-not-exist');
    expect(suggestion).toBeNull();
  });
});

describe('getSuggestionsByUser', () => {
  it('returns all suggestions by a user', async () => {
    const suggestions = await getSuggestionsByUser('user-new');
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    const names = suggestions.map((s) => s.suggested_name);
    expect(names).toContain('Mobile Data Costs');
  });
});

describe('getSuggestionsByStatus', () => {
  it('filters by status', async () => {
    const pending = await getSuggestionsByStatus('pending_review');
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.every((s) => s.status === 'pending_review')).toBe(true);
  });

  it('returns all suggestions when no status specified', async () => {
    const all = await getSuggestionsByStatus();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

describe('approveSuggestion', () => {
  it('approves a pending suggestion (step 1)', async () => {
    const result = await approveSuggestion('suggestion-mobile', 'user-sarah');
    expect(result).not.toBeNull();
    expect(result!.status).toBe('approved');
    expect(result!.reviewer_id).toBe('user-sarah');
    expect(result!.reviewed_at).toBeTruthy();
    expect(result!.approved_at).toBeTruthy();
  });

  it('can override category on approval', async () => {
    // Create a suggestion to approve with different category
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'bus services are bad',
      suggestedName: 'Bus Services',
      suggestedType: 'issue',
      category: 'Other',
    });
    const approved = await approveSuggestion(suggestion.id, 'user-sarah', 'Transport');
    expect(approved!.category).toBe('Transport');
  });

  it('does not approve an already approved suggestion', async () => {
    // suggestion-mobile is now approved — try approving again
    const before = await getSuggestionById('suggestion-mobile');
    const result = await approveSuggestion('suggestion-mobile', 'user-admin');
    // Status should still be 'approved', not changed
    expect(result!.status).toBe('approved');
    expect(result!.reviewer_id).toBe(before!.reviewer_id); // unchanged
  });
});

describe('rejectSuggestion', () => {
  it('rejects a suggestion with reason', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'people are bad',
      suggestedName: 'Bad People',
      suggestedType: 'issue',
      category: 'Other',
    });
    const result = await rejectSuggestion(suggestion.id, 'user-sarah', 'about_people');
    expect(result!.status).toBe('rejected');
    expect(result!.rejection_reason).toBe('about_people');
    expect(result!.reviewer_id).toBe('user-sarah');
  });

  it('rejects with close_to_existing and match IDs', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'rail delays',
      suggestedName: 'Rail Delays',
      suggestedType: 'issue',
      category: 'Transport',
    });
    const result = await rejectSuggestion(
      suggestion.id,
      'user-sarah',
      'close_to_existing',
      'Very similar to Rail Cancellations',
      ['issue-rail'],
    );
    expect(result!.rejection_reason).toBe('close_to_existing');
    expect(result!.rejection_detail).toBe('Very similar to Rail Cancellations');
    expect(result!.close_match_ids).toBe('["issue-rail"]');
  });

  it('also rejects the linked pending issue', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'test reject with issue',
      suggestedName: 'Reject Test Issue',
      suggestedType: 'issue',
      category: 'Other',
    });
    // Create a pending issue and link it
    const { getDb } = await import('../db');
    const db = getDb();
    const { generateId } = await import('@/lib/uuid');
    const issueId = generateId();
    await db.execute({
      sql: "INSERT INTO issues (id, name, category, status, first_rioter_id) VALUES (?, ?, ?, 'pending_review', ?)",
      args: [issueId, 'Reject Test Issue', 'Other', 'user-new'],
    });
    await db.execute({
      sql: 'UPDATE issue_suggestions SET issue_id = ? WHERE id = ?',
      args: [issueId, suggestion.id],
    });

    await rejectSuggestion(suggestion.id, 'user-sarah', 'other', 'Not relevant');
    const issue = await getIssueById(issueId);
    expect(issue!.status).toBe('rejected');
  });
});

describe('mergeSuggestion', () => {
  it('merges a suggestion into an existing issue', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'train problems',
      suggestedName: 'Train Problems',
      suggestedType: 'issue',
      category: 'Transport',
    });
    const result = await mergeSuggestion(suggestion.id, 'user-sarah', 'issue-rail');
    expect(result!.status).toBe('merged');
    expect(result!.merged_into_issue_id).toBe('issue-rail');
    expect(result!.reviewer_id).toBe('user-sarah');
  });
});

describe('requestMoreInfo', () => {
  it('sets status to more_info_requested with reviewer notes', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'water problems',
      suggestedName: 'Water Quality',
      suggestedType: 'issue',
      category: 'Water',
    });
    const result = await requestMoreInfo(
      suggestion.id,
      'user-sarah',
      'Can you describe the specific water quality issues?',
    );
    expect(result!.status).toBe('more_info_requested');
    expect(result!.reviewer_notes).toBe('Can you describe the specific water quality issues?');
  });
});

describe('markTranslationsReady', () => {
  it('transitions approved suggestion to translations_ready', async () => {
    // suggestion-mobile was approved above
    const result = await markTranslationsReady('suggestion-mobile');
    expect(result!.status).toBe('translations_ready');
  });

  it('does nothing if suggestion is not approved', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'pending test',
      suggestedName: 'Pending Test',
      suggestedType: 'issue',
      category: 'Other',
    });
    const result = await markTranslationsReady(suggestion.id);
    expect(result!.status).toBe('pending_review'); // unchanged
  });
});

describe('goLiveSuggestion', () => {
  it('transitions translations_ready to live and activates the issue', async () => {
    // suggestion-mobile is now translations_ready
    const result = await goLiveSuggestion('suggestion-mobile');
    expect(result!.status).toBe('live');
    expect(result!.live_at).toBeTruthy();

    // The linked issue should now be active
    const issue = await getIssueById('issue-mobile-data');
    expect(issue!.status).toBe('active');
    expect(issue!.approved_at).toBeTruthy();
  });

  it('does nothing if suggestion is not translations_ready', async () => {
    const suggestion = await createSuggestion({
      suggestedBy: 'user-new',
      originalText: 'live test',
      suggestedName: 'Live Test',
      suggestedType: 'issue',
      category: 'Other',
    });
    const result = await goLiveSuggestion(suggestion.id);
    expect(result!.status).toBe('pending_review'); // unchanged
  });
});

describe('setPublicRecognition', () => {
  it('toggles public recognition', async () => {
    const result = await setPublicRecognition('suggestion-mobile', 0);
    expect(result!.public_recognition).toBe(0);

    const result2 = await setPublicRecognition('suggestion-mobile', 1);
    expect(result2!.public_recognition).toBe(1);
  });
});

describe('setFirstRioterNotified', () => {
  it('marks first rioter as notified', async () => {
    await setFirstRioterNotified('suggestion-mobile');
    const suggestion = await getSuggestionById('suggestion-mobile');
    expect(suggestion!.first_rioter_notified).toBe(1);
  });
});

describe('getCloseMatches', () => {
  it('finds close matches for issues by name', async () => {
    const matches = await getCloseMatches('Rail', 'Transport', 'issue');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const names = matches.map((m) => m.name);
    expect(names).toContain('Rail Cancellations');
  });

  it('finds close matches via synonyms', async () => {
    const matches = await getCloseMatches('cancelled trains', 'Transport', 'issue');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array for no matches', async () => {
    const matches = await getCloseMatches('xyz123nonexistent', 'Tech', 'issue');
    expect(matches).toEqual([]);
  });

  it('returns empty array for very short words', async () => {
    const matches = await getCloseMatches('ab', 'Tech', 'issue');
    expect(matches).toEqual([]);
  });

  it('searches organisations when type is organisation', async () => {
    const matches = await getCloseMatches('Southern Rail', 'Transport', 'organisation');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].type).toBe('organisation');
  });
});
