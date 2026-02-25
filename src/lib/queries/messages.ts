import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type { Message, MessageType, MessageEntityType } from '@/types';

export async function createMessage(data: {
  recipientId: string;
  senderName?: string;
  type: MessageType;
  subject: string;
  body: string;
  entityType?: MessageEntityType;
  entityId?: string;
}): Promise<Message> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO messages (id, recipient_id, sender_name, type, subject, body, entity_type, entity_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.recipientId,
      data.senderName ?? null,
      data.type,
      data.subject,
      data.body,
      data.entityType ?? null,
      data.entityId ?? null,
    ],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Message;
}

export async function getMessages(
  recipientId: string,
  options?: { unreadOnly?: boolean; limit?: number; offset?: number },
): Promise<Message[]> {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  if (options?.unreadOnly) {
    const result = await db.execute({
      sql: 'SELECT * FROM messages WHERE recipient_id = ? AND read = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [recipientId, limit, offset],
    });
    return result.rows as unknown as Message[];
  }

  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [recipientId, limit, offset],
  });
  return result.rows as unknown as Message[];
}

export async function getMessageById(id: string): Promise<Message | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Message) ?? null;
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0',
    args: [recipientId],
  });
  return (result.rows[0]?.count as number) ?? 0;
}

export async function markAsRead(id: string, recipientId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'UPDATE messages SET read = 1 WHERE id = ? AND recipient_id = ?',
    args: [id, recipientId],
  });
  return result.rowsAffected > 0;
}

export async function markAllAsRead(recipientId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: 'UPDATE messages SET read = 1 WHERE recipient_id = ? AND read = 0',
    args: [recipientId],
  });
  return result.rowsAffected;
}
