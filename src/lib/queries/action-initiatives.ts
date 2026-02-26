import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { ActionInitiative, ActionInitiativeStatus, Category } from '@/types';

export interface ActionInitiativeWithIssue extends ActionInitiative {
  issue_name: string;
  issue_category: Category;
}

export async function getActionInitiatives(issueId?: string, status?: ActionInitiativeStatus): Promise<ActionInitiative[]> {
  const db = getDb();
  let query = 'SELECT * FROM action_initiatives WHERE 1=1';
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
  return result.rows as unknown as ActionInitiative[];
}

export async function getActionInitiativeById(id: string): Promise<ActionInitiative | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM action_initiatives WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as ActionInitiative) ?? null;
}

export async function createActionInitiative(data: {
  issueId: string;
  orgId?: string;
  title: string;
  description?: string;
  targetPence: number;
  recipient?: string;
  recipientUrl?: string;
  serviceFeePct?: number;
}): Promise<ActionInitiative> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO action_initiatives (id, issue_id, org_id, title, description, target_pence, recipient, recipient_url, service_fee_pct)
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
      data.serviceFeePct ?? 15,
    ],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM action_initiatives WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as ActionInitiative;
}

export async function getActionInitiativesWithIssues(
  status?: ActionInitiativeStatus,
): Promise<ActionInitiativeWithIssue[]> {
  const db = getDb();
  let query = `SELECT c.*, i.name AS issue_name, i.category AS issue_category
               FROM action_initiatives c
               JOIN issues i ON c.issue_id = i.id
               WHERE 1=1`;
  const args: string[] = [];

  if (status) {
    query += ' AND c.status = ?';
    args.push(status);
  }

  query += ' ORDER BY c.status ASC, c.committed_pence DESC';
  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as ActionInitiativeWithIssue[];
}

export async function getActionInitiativesForIssue(issueId: string): Promise<ActionInitiative[]> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM action_initiatives WHERE issue_id = ? AND status = 'active' ORDER BY committed_pence DESC",
    args: [issueId],
  });
  return result.rows as unknown as ActionInitiative[];
}
