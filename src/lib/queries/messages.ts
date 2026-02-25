import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import { getUserById } from './users';
import { sendEmail } from '../email';
import { sendWhatsAppMessage } from '../whatsapp';
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

/**
 * Multi-channel notification delivery.
 * Always creates an inbox message. Also sends email + WhatsApp if user has those channels.
 * Graceful — never throws.
 */
export async function sendNotification(data: {
  recipientId: string;
  senderName?: string;
  type: MessageType;
  subject: string;
  body: string;
  entityType?: MessageEntityType;
  entityId?: string;
  whatsAppSummary?: string;
}): Promise<Message | null> {
  try {
    // 1. Always create inbox message
    const message = await createMessage({
      recipientId: data.recipientId,
      senderName: data.senderName,
      type: data.type,
      subject: data.subject,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
    });

    // 2. Look up user for email/phone channels
    const user = await getUserById(data.recipientId);
    if (!user) return message;

    // 3. WhatsApp push (if user has phone)
    if (user.phone) {
      const waMessage = data.whatsAppSummary || `${data.subject}: ${data.body.slice(0, 500)}`;
      sendWhatsAppMessage(user.phone, waMessage).catch(() => {});
    }

    // 4. Email (only if real email, not wa-* placeholder)
    if (user.email && !user.email.startsWith('wa-')) {
      const htmlBody = `<p>${data.body.replace(/\n/g, '</p><p>')}</p>`;
      sendEmail(user.email, data.subject, htmlBody).catch(() => {});
    }

    return message;
  } catch (error) {
    console.error('sendNotification failed:', error);
    return null;
  }
}
