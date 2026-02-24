import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Evidence, EvidenceComment } from '@/types';

const EVIDENCE_SELECT = `
  SELECT e.*, u.name as user_name, o.name as org_name, i.name as issue_name
  FROM evidence e
  JOIN users u ON e.user_id = u.id
  LEFT JOIN organisations o ON e.org_id = o.id
  JOIN issues i ON e.issue_id = i.id`;

export async function getEvidenceForIssue(
  issueId: string,
  orgId?: string,
  limit: number = 20,
): Promise<Evidence[]> {
  const db = getDb();
  if (orgId) {
    const result = await db.execute({
      sql: `${EVIDENCE_SELECT}
            WHERE e.issue_id = ? AND e.org_id = ?
            ORDER BY e.live DESC, e.created_at DESC
            LIMIT ?`,
      args: [issueId, orgId, limit],
    });
    return result.rows as unknown as Evidence[];
  }
  const result = await db.execute({
    sql: `${EVIDENCE_SELECT}
          WHERE e.issue_id = ?
          ORDER BY e.live DESC, e.created_at DESC
          LIMIT ?`,
    args: [issueId, limit],
  });
  return result.rows as unknown as Evidence[];
}

export async function getEvidenceForOrg(orgId: string, limit: number = 20): Promise<Evidence[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `${EVIDENCE_SELECT}
          WHERE e.org_id = ?
          ORDER BY e.live DESC, e.created_at DESC
          LIMIT ?`,
    args: [orgId, limit],
  });
  return result.rows as unknown as Evidence[];
}

export async function createEvidence(data: {
  issueId: string;
  orgId: string | null;
  userId: string;
  content: string;
  mediaType: 'text' | 'photo' | 'video' | 'link' | 'live_stream';
  photoUrls?: string[];
  videoUrl?: string | null;
  externalUrls?: string[];
  live?: boolean;
}): Promise<Evidence> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO evidence (id, issue_id, org_id, user_id, content, media_type, photo_urls, video_url, external_urls, live)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.issueId,
      data.orgId,
      data.userId,
      data.content,
      data.mediaType,
      JSON.stringify(data.photoUrls ?? []),
      data.videoUrl ?? null,
      JSON.stringify(data.externalUrls ?? []),
      data.live ? 1 : 0,
    ],
  });
  const result = await db.execute({
    sql: `${EVIDENCE_SELECT} WHERE e.id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as Evidence;
}

export async function likeEvidence(evidenceId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE evidence SET likes = likes + 1 WHERE id = ?',
    args: [evidenceId],
  });
}

export async function shareEvidence(evidenceId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE evidence SET shares = shares + 1 WHERE id = ?',
    args: [evidenceId],
  });
}

export async function getEvidenceComments(
  evidenceId: string,
  limit: number = 50,
): Promise<EvidenceComment[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT ec.*, u.name as user_name
          FROM evidence_comments ec
          JOIN users u ON ec.user_id = u.id
          WHERE ec.evidence_id = ?
          ORDER BY ec.created_at ASC
          LIMIT ?`,
    args: [evidenceId, limit],
  });
  return result.rows as unknown as EvidenceComment[];
}

export async function addEvidenceComment(
  evidenceId: string,
  userId: string,
  content: string,
): Promise<EvidenceComment> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: 'INSERT INTO evidence_comments (id, evidence_id, user_id, content) VALUES (?, ?, ?, ?)',
    args: [id, evidenceId, userId, content],
  });
  await db.execute({
    sql: 'UPDATE evidence SET comments_count = comments_count + 1 WHERE id = ?',
    args: [evidenceId],
  });
  const result = await db.execute({
    sql: `SELECT ec.*, u.name as user_name
          FROM evidence_comments ec
          JOIN users u ON ec.user_id = u.id
          WHERE ec.id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as EvidenceComment;
}

export async function getEvidenceCountForIssue(issueId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM evidence WHERE issue_id = ?',
    args: [issueId],
  });
  return Number(result.rows[0]?.count ?? 0);
}

export async function getLiveEvidence(issueId: string): Promise<Evidence[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `${EVIDENCE_SELECT}
          WHERE e.issue_id = ? AND e.live = 1
          ORDER BY e.created_at DESC`,
    args: [issueId],
  });
  return result.rows as unknown as Evidence[];
}
