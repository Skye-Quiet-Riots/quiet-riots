import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Campaign, CampaignStatus, Category } from '@/types';

export interface CampaignWithIssue extends Campaign {
  issue_name: string;
  issue_category: Category;
}

export async function getCampaigns(issueId?: string, status?: CampaignStatus): Promise<Campaign[]> {
  const db = getDb();
  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const args: (string | number)[] = [];

  if (issueId) {
    query += ' AND issue_id = ?';
    args.push(issueId);
  }
  if (status) {
    query += ' AND status = ?';
    args.push(status);
  }

  query += ' ORDER BY created_at DESC';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Campaign) ?? null;
}

export async function createCampaign(data: {
  issueId: string;
  orgId?: string;
  title: string;
  description?: string;
  targetPence: number;
  recipient?: string;
  recipientUrl?: string;
  platformFeePct?: number;
}): Promise<Campaign> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO campaigns (id, issue_id, org_id, title, description, target_pence, recipient, recipient_url, platform_fee_pct)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.issueId,
      data.orgId ?? null,
      data.title,
      data.description ?? '',
      data.targetPence,
      data.recipient ?? null,
      data.recipientUrl ?? null,
      data.platformFeePct ?? 15,
    ],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Campaign;
}

export async function getCampaignsWithIssues(
  status?: CampaignStatus,
): Promise<CampaignWithIssue[]> {
  const db = getDb();
  let query = `SELECT c.*, i.name AS issue_name, i.category AS issue_category
               FROM campaigns c
               JOIN issues i ON c.issue_id = i.id
               WHERE 1=1`;
  const args: string[] = [];

  if (status) {
    query += ' AND c.status = ?';
    args.push(status);
  }

  query += ' ORDER BY c.status ASC, c.raised_pence DESC';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as CampaignWithIssue[];
}

export async function getCampaignsForIssue(issueId: string): Promise<Campaign[]> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM campaigns WHERE issue_id = ? AND status = 'active' ORDER BY raised_pence DESC",
    args: [issueId],
  });
  return result.rows as unknown as Campaign[];
}
