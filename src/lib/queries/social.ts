import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { UserBlock, Report, ReportEntityType, ReportReason, ReportStatus } from '@/types';

// ---------- Blocking ----------

export async function blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }
  const db = getDb();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)',
    args: [blockerId, blockedId],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    args: [blockerId, blockedId],
  });
  return result.rows[0] as unknown as UserBlock;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    args: [blockerId, blockedId],
  });
}

export async function getBlockedUsers(userId: string): Promise<UserBlock[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_blocks WHERE blocker_id = ? ORDER BY created_at DESC',
    args: [userId],
  });
  return result.rows as unknown as UserBlock[];
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    args: [blockerId, blockedId],
  });
  return result.rows.length > 0;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT blocked_id FROM user_blocks WHERE blocker_id = ?',
    args: [userId],
  });
  return result.rows.map((row) => (row as unknown as { blocked_id: string }).blocked_id);
}

// ---------- Reporting ----------

export async function createReport(
  reporterId: string,
  entityType: ReportEntityType,
  entityId: string,
  reason: ReportReason,
  description?: string,
): Promise<Report> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO reports (id, reporter_id, entity_type, entity_id, reason, description)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, reporterId, entityType, entityId, reason, description ?? null],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM reports WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Report;
}

export async function getReportsForEntity(
  entityType: ReportEntityType,
  entityId: string,
): Promise<Report[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM reports WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
    args: [entityType, entityId],
  });
  return result.rows as unknown as Report[];
}

export async function getUserReports(userId: string, limit = 50): Promise<Report[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [userId, limit],
  });
  return result.rows as unknown as Report[];
}

export async function getPendingReports(limit = 50): Promise<Report[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as Report[];
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<Report> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE reports SET status = ? WHERE id = ?',
    args: [status, reportId],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM reports WHERE id = ?',
    args: [reportId],
  });
  const report = (result.rows[0] as unknown as Report) ?? null;
  if (!report) {
    throw new Error('Report not found');
  }
  return report;
}
