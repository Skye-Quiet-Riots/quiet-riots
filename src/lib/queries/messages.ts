import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import { getUserById } from './users';
import { sendEmail } from '../email';
import type { Message, MessageType, MessageEntityType } from '@/types';

/** WhatsApp delivery window: 4 hours from creation */
const WHATSAPP_DELIVERY_HOURS = 4;

/** Max delivery attempts before giving up */
const MAX_WHATSAPP_ATTEMPTS = 5;

export async function createMessage(data: {
  recipientId: string;
  senderName?: string;
  type: MessageType;
  subject: string;
  body: string;
  entityType?: MessageEntityType;
  entityId?: string;
  whatsappMessage?: string;
  whatsappExpiresAt?: string;
}): Promise<Message> {
  const db = getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO messages (id, recipient_id, sender_name, type, subject, body, entity_type, entity_id, whatsapp_message, whatsapp_expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.recipientId,
      data.senderName ?? null,
      data.type,
      data.subject,
      data.body,
      data.entityType ?? null,
      data.entityId ?? null,
      data.whatsappMessage ?? null,
      data.whatsappExpiresAt ?? null,
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

// ─── WhatsApp Delivery Queue ─────────────────────────────

/**
 * Get messages pending WhatsApp delivery.
 * JOINs to users table for phone (no stale data).
 * Returns oldest first (FIFO), max 10 at a time.
 */
export async function getUndeliveredMessages(): Promise<
  Array<{ id: string; phone: string; whatsapp_message: string }>
> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT m.id, u.phone, m.whatsapp_message
          FROM messages m
          JOIN users u ON u.id = m.recipient_id
          WHERE m.whatsapp_message IS NOT NULL
            AND m.whatsapp_delivered_at IS NULL
            AND m.whatsapp_expires_at > datetime('now')
            AND m.whatsapp_attempts < ?
            AND u.phone IS NOT NULL
          ORDER BY m.created_at ASC
          LIMIT 10`,
    args: [MAX_WHATSAPP_ATTEMPTS],
  });
  return result.rows as unknown as Array<{ id: string; phone: string; whatsapp_message: string }>;
}

/**
 * Atomically mark a message as delivered via WhatsApp.
 * NULLs whatsapp_message for defence in depth.
 * Returns true if the message was marked (prevents double-delivery).
 */
export async function markMessageDelivered(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE messages
          SET whatsapp_delivered_at = datetime('now'),
              whatsapp_message = NULL
          WHERE id = ? AND whatsapp_delivered_at IS NULL`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

/**
 * Increment the delivery attempt counter for a message.
 * Called before each send attempt for retry tracking.
 */
export async function incrementDeliveryAttempt(id: string): Promise<number | null> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE messages SET whatsapp_attempts = whatsapp_attempts + 1 WHERE id = ?',
    args: [id],
  });
  const result = await db.execute({
    sql: 'SELECT whatsapp_attempts FROM messages WHERE id = ?',
    args: [id],
  });
  if (!result.rows[0]) return null;
  return result.rows[0].whatsapp_attempts as number;
}

/**
 * Clean up expired delivery messages (defence in depth).
 * NULLs whatsapp_message for messages past their delivery window.
 */
export async function cleanExpiredDeliveryMessages(): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE messages
          SET whatsapp_message = NULL
          WHERE whatsapp_message IS NOT NULL
            AND whatsapp_delivered_at IS NULL
            AND whatsapp_expires_at <= datetime('now')`,
    args: [],
  });
  return result.rowsAffected;
}

/**
 * Multi-channel notification delivery.
 * Always creates an inbox message. Queues WhatsApp delivery for polling script.
 * Sends email directly (Resend API works from Vercel).
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
    // 1. Look up user for email/phone channels
    const user = await getUserById(data.recipientId);

    // 2. Build WhatsApp delivery fields (if user has phone)
    let whatsappMessage: string | undefined;
    let whatsappExpiresAt: string | undefined;
    if (user?.phone) {
      whatsappMessage = data.whatsAppSummary || `${data.subject}: ${data.body.slice(0, 500)}`;
      // 4-hour delivery window
      const expires = new Date(Date.now() + WHATSAPP_DELIVERY_HOURS * 60 * 60 * 1000);
      whatsappExpiresAt = expires.toISOString().replace('T', ' ').replace('Z', '');
    }

    // 3. Create inbox message (with WhatsApp queue fields if applicable)
    const message = await createMessage({
      recipientId: data.recipientId,
      senderName: data.senderName,
      type: data.type,
      subject: data.subject,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
      whatsappMessage,
      whatsappExpiresAt,
    });

    // 4. Email (only if real email, not wa-* placeholder)
    if (user?.email && !user.email.startsWith('wa-')) {
      const htmlBody = `<p>${data.body.replace(/\n/g, '</p><p>')}</p>`;
      sendEmail(user.email, data.subject, htmlBody).catch(() => {});
    }

    return message;
  } catch (error) {
    console.error('sendNotification failed:', error);
    return null;
  }
}
