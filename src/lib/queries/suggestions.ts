import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type {
  IssueSuggestion,
  SuggestionStatus,
  SuggestedType,
  RejectionReason,
  Category,
} from '@/types';

// ---------- Create ----------

export async function createSuggestion(data: {
  suggestedBy: string;
  originalText: string;
  suggestedName: string;
  suggestedType: SuggestedType;
  category: Category;
  description?: string;
  issueId?: string;
  organisationId?: string;
  closeMatchIds?: string[];
  publicRecognition?: number;
}): Promise<IssueSuggestion> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO issue_suggestions
          (id, suggested_by, original_text, suggested_name, suggested_type, category, description,
           issue_id, organisation_id, close_match_ids, public_recognition)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.suggestedBy,
      data.originalText,
      data.suggestedName,
      data.suggestedType,
      data.category,
      data.description ?? '',
      data.issueId ?? null,
      data.organisationId ?? null,
      data.closeMatchIds ? JSON.stringify(data.closeMatchIds) : null,
      data.publicRecognition ?? 1,
    ],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM issue_suggestions WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as IssueSuggestion;
}

// ---------- Read ----------

export async function getSuggestionById(id: string): Promise<IssueSuggestion | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM issue_suggestions WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as IssueSuggestion) ?? null;
}

export async function getSuggestionsByUser(userId: string): Promise<IssueSuggestion[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM issue_suggestions WHERE suggested_by = ? ORDER BY created_at DESC',
    args: [userId],
  });
  return result.rows as unknown as IssueSuggestion[];
}

export async function getSuggestionsByStatus(
  status?: SuggestionStatus,
  limit = 50,
  offset = 0,
): Promise<IssueSuggestion[]> {
  const db = getDb();
  if (status) {
    const result = await db.execute({
      sql: 'SELECT * FROM issue_suggestions WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [status, limit, offset],
    });
    return result.rows as unknown as IssueSuggestion[];
  }
  const result = await db.execute({
    sql: 'SELECT * FROM issue_suggestions ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [limit, offset],
  });
  return result.rows as unknown as IssueSuggestion[];
}

// ---------- Review Actions ----------

export async function approveSuggestion(
  id: string,
  reviewerId: string,
  category?: Category,
  reviewerNotes?: string,
): Promise<IssueSuggestion | null> {
  const db = getDb();
  const sets: string[] = [
    "status = 'approved'",
    'reviewer_id = ?',
    "reviewed_at = datetime('now')",
    "approved_at = datetime('now')",
    "updated_at = datetime('now')",
  ];
  const args: (string | number | null)[] = [reviewerId];

  if (category) {
    sets.push('category = ?');
    args.push(category);
  }
  if (reviewerNotes !== undefined) {
    sets.push('reviewer_notes = ?');
    args.push(reviewerNotes);
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE issue_suggestions SET ${sets.join(', ')} WHERE id = ? AND status IN ('pending_review', 'more_info_requested')`,
    args,
  });
  return getSuggestionById(id);
}

export async function rejectSuggestion(
  id: string,
  reviewerId: string,
  reason: RejectionReason,
  detail?: string,
  closeMatchIds?: string[],
): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions
          SET status = 'rejected', reviewer_id = ?, rejection_reason = ?, rejection_detail = ?,
              close_match_ids = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ? AND status IN ('pending_review', 'more_info_requested')`,
    args: [
      reviewerId,
      reason,
      detail ?? null,
      closeMatchIds ? JSON.stringify(closeMatchIds) : null,
      id,
    ],
  });

  // Also reject the linked issue/org if it exists
  const suggestion = await getSuggestionById(id);
  if (suggestion) {
    if (suggestion.issue_id) {
      await db.execute({
        sql: "UPDATE issues SET status = 'rejected' WHERE id = ? AND status = 'pending_review'",
        args: [suggestion.issue_id],
      });
    }
    if (suggestion.organisation_id) {
      await db.execute({
        sql: "UPDATE organisations SET status = 'rejected' WHERE id = ? AND status = 'pending_review'",
        args: [suggestion.organisation_id],
      });
    }
  }

  return suggestion;
}

export async function mergeSuggestion(
  id: string,
  reviewerId: string,
  mergeTargetIssueId?: string,
  mergeTargetOrgId?: string,
): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions
          SET status = 'merged', reviewer_id = ?, merged_into_issue_id = ?, merged_into_org_id = ?,
              reviewed_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ? AND status IN ('pending_review', 'more_info_requested')`,
    args: [reviewerId, mergeTargetIssueId ?? null, mergeTargetOrgId ?? null, id],
  });

  // Reject the pending entity since it's being merged
  const suggestion = await getSuggestionById(id);
  if (suggestion) {
    if (suggestion.issue_id) {
      await db.execute({
        sql: "UPDATE issues SET status = 'rejected' WHERE id = ? AND status = 'pending_review'",
        args: [suggestion.issue_id],
      });
    }
    if (suggestion.organisation_id) {
      await db.execute({
        sql: "UPDATE organisations SET status = 'rejected' WHERE id = ? AND status = 'pending_review'",
        args: [suggestion.organisation_id],
      });
    }
  }

  return suggestion;
}

export async function requestMoreInfo(
  id: string,
  reviewerId: string,
  reviewerNotes: string,
): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions
          SET status = 'more_info_requested', reviewer_id = ?, reviewer_notes = ?,
              reviewed_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ? AND status = 'pending_review'`,
    args: [reviewerId, reviewerNotes, id],
  });
  return getSuggestionById(id);
}

export async function markTranslationsReady(id: string): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions
          SET status = 'translations_ready', updated_at = datetime('now')
          WHERE id = ? AND status = 'approved'`,
    args: [id],
  });
  return getSuggestionById(id);
}

export async function goLiveSuggestion(id: string): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions
          SET status = 'live', live_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ? AND status = 'translations_ready'`,
    args: [id],
  });

  // Activate the linked issue/org
  const suggestion = await getSuggestionById(id);
  if (suggestion) {
    if (suggestion.issue_id) {
      await db.execute({
        sql: "UPDATE issues SET status = 'active', approved_at = datetime('now') WHERE id = ?",
        args: [suggestion.issue_id],
      });
    }
    if (suggestion.organisation_id) {
      await db.execute({
        sql: "UPDATE organisations SET status = 'active', approved_at = datetime('now') WHERE id = ?",
        args: [suggestion.organisation_id],
      });
    }
  }

  return suggestion;
}

// ---------- Recognition ----------

export async function setPublicRecognition(
  id: string,
  publicRecognition: number,
): Promise<IssueSuggestion | null> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions SET public_recognition = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [publicRecognition, id],
  });
  return getSuggestionById(id);
}

export async function setFirstRioterNotified(id: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE issue_suggestions SET first_rioter_notified = 1, updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  });
}

// ---------- Close Matches ----------

/**
 * Find issues/orgs with similar names to the suggestion.
 * Uses LIKE matching on both the entity name and synonyms.
 */
export async function getCloseMatches(
  suggestedName: string,
  category: Category,
  suggestedType: SuggestedType,
): Promise<{ id: string; name: string; type: string }[]> {
  const db = getDb();
  const words = suggestedName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (words.length === 0) return [];

  if (suggestedType === 'issue') {
    // Search issues by name and synonyms
    const conditions = words.map(
      () =>
        "(name LIKE ? ESCAPE '\\' OR id IN (SELECT issue_id FROM synonyms WHERE term LIKE ? ESCAPE '\\'))",
    );
    const args: (string | number)[] = [];
    for (const word of words) {
      const escaped = word.replace(/[%_\\]/g, '\\$&');
      args.push(`%${escaped}%`);
      args.push(`%${escaped}%`);
    }
    args.push(category);

    const result = await db.execute({
      sql: `SELECT id, name, 'issue' as type FROM issues
            WHERE (${conditions.join(' OR ')})
            AND category = ?
            AND status = 'active'
            ORDER BY rioter_count DESC
            LIMIT 5`,
      args,
    });
    return result.rows as unknown as { id: string; name: string; type: string }[];
  } else {
    // Search organisations by name
    const conditions = words.map(() => "name LIKE ? ESCAPE '\\'");
    const args: (string | number)[] = [];
    for (const word of words) {
      const escaped = word.replace(/[%_\\]/g, '\\$&');
      args.push(`%${escaped}%`);
    }
    args.push(category);

    const result = await db.execute({
      sql: `SELECT id, name, 'organisation' as type FROM organisations
            WHERE (${conditions.join(' OR ')})
            AND category = ?
            AND status = 'active'
            ORDER BY name
            LIMIT 5`,
      args,
    });
    return result.rows as unknown as { id: string; name: string; type: string }[];
  }
}
