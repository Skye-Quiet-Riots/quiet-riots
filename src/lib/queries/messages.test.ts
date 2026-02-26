import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getDb } from '../db';
import {
  createMessage,
  getMessages,
  getMessageById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUndeliveredMessages,
  markMessageDelivered,
  incrementDeliveryAttempt,
  cleanExpiredDeliveryMessages,
  sendNotification,
} from './messages';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('createMessage', () => {
  it('creates a new message', async () => {
    const msg = await createMessage({
      recipientId: 'user-sarah',
      senderName: 'System',
      type: 'general',
      subject: 'Test message',
      body: 'This is a test message body.',
    });
    expect(msg.id).toBeTruthy();
    expect(msg.recipient_id).toBe('user-sarah');
    expect(msg.sender_name).toBe('System');
    expect(msg.type).toBe('general');
    expect(msg.subject).toBe('Test message');
    expect(msg.body).toBe('This is a test message body.');
    expect(msg.read).toBe(0);
    expect(msg.created_at).toBeTruthy();
  });

  it('creates a message with entity reference', async () => {
    const msg = await createMessage({
      recipientId: 'user-new',
      type: 'suggestion_received',
      subject: 'New suggestion',
      body: 'A new suggestion was received.',
      entityType: 'issue_suggestion',
      entityId: 'suggestion-mobile',
    });
    expect(msg.entity_type).toBe('issue_suggestion');
    expect(msg.entity_id).toBe('suggestion-mobile');
  });

  it('creates a message without optional fields', async () => {
    const msg = await createMessage({
      recipientId: 'user-marcio',
      type: 'general',
      subject: 'Simple message',
      body: 'No sender or entity.',
    });
    expect(msg.sender_name).toBeNull();
    expect(msg.entity_type).toBeNull();
    expect(msg.entity_id).toBeNull();
  });

  it('creates a message with WhatsApp delivery fields', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'WA test',
      body: 'WhatsApp delivery test.',
      whatsappMessage: 'WA test: WhatsApp delivery test.',
      whatsappExpiresAt: expiresAt,
    });
    expect(msg.whatsapp_message).toBe('WA test: WhatsApp delivery test.');
    expect(msg.whatsapp_expires_at).toBe(expiresAt);
    expect(msg.whatsapp_delivered_at).toBeNull();
    expect(msg.whatsapp_attempts).toBe(0);
  });

  it('creates a message without WhatsApp fields when not provided', async () => {
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'No WA',
      body: 'No WhatsApp delivery.',
    });
    expect(msg.whatsapp_message).toBeNull();
    expect(msg.whatsapp_expires_at).toBeNull();
    expect(msg.whatsapp_delivered_at).toBeNull();
  });
});

describe('getMessages', () => {
  it('returns all messages for a recipient ordered by newest first', async () => {
    const messages = await getMessages('user-sarah');
    expect(messages.length).toBeGreaterThanOrEqual(1);
    // msg-001 is from seed data for sarah
    const seeded = messages.find((m) => m.id === 'msg-001');
    expect(seeded).toBeTruthy();
    expect(seeded!.subject).toBe('New suggestion: Mobile Data Costs');
  });

  it('returns only unread messages when unreadOnly is true', async () => {
    const unread = await getMessages('user-sarah', { unreadOnly: true });
    expect(unread.every((m) => m.read === 0)).toBe(true);
  });

  it('respects limit parameter', async () => {
    const messages = await getMessages('user-sarah', { limit: 1 });
    expect(messages).toHaveLength(1);
  });

  it('returns empty array for user with no messages', async () => {
    const messages = await getMessages('user-admin');
    expect(messages).toEqual([]);
  });
});

describe('getMessageById', () => {
  it('returns a message by id', async () => {
    const msg = await getMessageById('msg-001');
    expect(msg).not.toBeNull();
    expect(msg!.subject).toBe('New suggestion: Mobile Data Costs');
  });

  it('returns null for non-existent id', async () => {
    const msg = await getMessageById('does-not-exist');
    expect(msg).toBeNull();
  });
});

describe('getUnreadCount', () => {
  it('returns the count of unread messages', async () => {
    const count = await getUnreadCount('user-sarah');
    expect(count).toBeGreaterThanOrEqual(1); // msg-001 is unread
  });

  it('returns 0 for user with no unread messages', async () => {
    // user-new has msg-002 which is read=1
    const count = await getUnreadCount('user-admin');
    expect(count).toBe(0);
  });
});

describe('markAsRead', () => {
  it('marks a message as read and returns true', async () => {
    const result = await markAsRead('msg-001', 'user-sarah');
    expect(result).toBe(true);

    const msg = await getMessageById('msg-001');
    expect(msg!.read).toBe(1);
  });

  it('returns false when recipient does not match', async () => {
    const result = await markAsRead('msg-003', 'user-sarah'); // msg-003 is for marcio
    expect(result).toBe(false);
  });
});

describe('markAllAsRead', () => {
  it('marks all unread messages as read', async () => {
    // Create some unread messages
    await createMessage({
      recipientId: 'user-marcio',
      type: 'general',
      subject: 'Batch test 1',
      body: 'Test body 1',
    });
    await createMessage({
      recipientId: 'user-marcio',
      type: 'general',
      subject: 'Batch test 2',
      body: 'Test body 2',
    });

    const countBefore = await getUnreadCount('user-marcio');
    expect(countBefore).toBeGreaterThanOrEqual(2);

    const marked = await markAllAsRead('user-marcio');
    expect(marked).toBeGreaterThanOrEqual(2);

    const countAfter = await getUnreadCount('user-marcio');
    expect(countAfter).toBe(0);
  });
});

// ─── WhatsApp Delivery Queue Tests ──────────────────────────

describe('getUndeliveredMessages', () => {
  it('returns messages pending WhatsApp delivery', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah', // has phone +447700900001
      type: 'general',
      subject: 'Pending delivery',
      body: 'Should appear in undelivered.',
      whatsappMessage: 'Pending delivery: Should appear in undelivered.',
      whatsappExpiresAt: expiresAt,
    });

    const undelivered = await getUndeliveredMessages();
    const found = undelivered.find((m) => m.id === msg.id);
    expect(found).toBeTruthy();
    expect(found!.phone).toBe('+447700900001');
    expect(found!.whatsapp_message).toBe('Pending delivery: Should appear in undelivered.');
  });

  it('returns empty array when no messages pending', async () => {
    // Mark all as delivered first
    const undelivered = await getUndeliveredMessages();
    for (const m of undelivered) {
      await markMessageDelivered(m.id);
    }
    const result = await getUndeliveredMessages();
    expect(result).toEqual([]);
  });

  it('excludes expired messages', async () => {
    // Create a message with an expiry in the past
    const pastExpiry = new Date(Date.now() - 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Expired msg',
      body: 'This message expired.',
      whatsappMessage: 'Expired msg',
      whatsappExpiresAt: pastExpiry,
    });

    const undelivered = await getUndeliveredMessages();
    const found = undelivered.find((m) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  it('excludes already-delivered messages', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Already delivered',
      body: 'This was already delivered.',
      whatsappMessage: 'Already delivered',
      whatsappExpiresAt: expiresAt,
    });

    await markMessageDelivered(msg.id);

    const undelivered = await getUndeliveredMessages();
    const found = undelivered.find((m) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  it('excludes messages without WhatsApp content', async () => {
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'No WA content',
      body: 'Inbox only, no WhatsApp.',
    });

    const undelivered = await getUndeliveredMessages();
    const found = undelivered.find((m) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  it('excludes messages with max attempts exceeded', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Max retries',
      body: 'Hit max attempts.',
      whatsappMessage: 'Max retries',
      whatsappExpiresAt: expiresAt,
    });

    // Increment to 5 attempts (max)
    for (let i = 0; i < 5; i++) {
      await incrementDeliveryAttempt(msg.id);
    }

    const undelivered = await getUndeliveredMessages();
    const found = undelivered.find((m) => m.id === msg.id);
    expect(found).toBeUndefined();
  });

  it('returns messages in FIFO order (oldest first)', async () => {
    // Clean up any pending messages
    let pending = await getUndeliveredMessages();
    for (const m of pending) await markMessageDelivered(m.id);

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');

    const msg1 = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'First',
      body: 'Created first.',
      whatsappMessage: 'First',
      whatsappExpiresAt: expiresAt,
    });
    const msg2 = await createMessage({
      recipientId: 'user-marcio',
      type: 'general',
      subject: 'Second',
      body: 'Created second.',
      whatsappMessage: 'Second',
      whatsappExpiresAt: expiresAt,
    });

    pending = await getUndeliveredMessages();
    const ids = pending.map((m) => m.id);
    const idx1 = ids.indexOf(msg1.id);
    const idx2 = ids.indexOf(msg2.id);
    expect(idx1).toBeLessThan(idx2);
  });
});

describe('markMessageDelivered', () => {
  it('sets delivered_at and NULLs whatsapp_message (defence in depth)', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'To deliver',
      body: 'Will be delivered.',
      whatsappMessage: 'To deliver: Will be delivered.',
      whatsappExpiresAt: expiresAt,
    });

    const result = await markMessageDelivered(msg.id);
    expect(result).toBe(true);

    const updated = await getMessageById(msg.id);
    expect(updated!.whatsapp_delivered_at).toBeTruthy();
    expect(updated!.whatsapp_message).toBeNull();
  });

  it('returns false for already-delivered message (atomic guard)', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Double deliver test',
      body: 'Test body.',
      whatsappMessage: 'Double deliver test',
      whatsappExpiresAt: expiresAt,
    });

    const first = await markMessageDelivered(msg.id);
    expect(first).toBe(true);

    const second = await markMessageDelivered(msg.id);
    expect(second).toBe(false);
  });

  it('returns false for non-existent message ID', async () => {
    const result = await markMessageDelivered('nonexistent-msg-id');
    expect(result).toBe(false);
  });

  it('does not affect inbox read status', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Read status test',
      body: 'Delivery should not mark as read.',
      whatsappMessage: 'Read status test',
      whatsappExpiresAt: expiresAt,
    });

    await markMessageDelivered(msg.id);
    const updated = await getMessageById(msg.id);
    expect(updated!.read).toBe(0); // Still unread in inbox
  });

  it('handles race condition — only one of concurrent calls succeeds', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Race test',
      body: 'Concurrent delivery test.',
      whatsappMessage: 'Race test',
      whatsappExpiresAt: expiresAt,
    });

    const [r1, r2] = await Promise.all([
      markMessageDelivered(msg.id),
      markMessageDelivered(msg.id),
    ]);

    // Exactly one should succeed
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
  });
});

describe('incrementDeliveryAttempt', () => {
  it('increments the attempt counter', async () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Attempt count test',
      body: 'Testing retry counter.',
      whatsappMessage: 'Attempt count test',
      whatsappExpiresAt: expiresAt,
    });

    const count1 = await incrementDeliveryAttempt(msg.id);
    expect(count1).toBe(1);

    const count2 = await incrementDeliveryAttempt(msg.id);
    expect(count2).toBe(2);
  });

  it('returns null for non-existent message', async () => {
    const result = await incrementDeliveryAttempt('nonexistent-msg-id');
    expect(result).toBeNull();
  });
});

describe('cleanExpiredDeliveryMessages', () => {
  it('NULLs whatsapp_message for expired undelivered messages', async () => {
    // Create a message with an already-expired delivery window
    const pastExpiry = new Date(Date.now() - 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');
    const msg = await createMessage({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Expired cleanup test',
      body: 'This should be cleaned up.',
      whatsappMessage: 'Expired cleanup test',
      whatsappExpiresAt: pastExpiry,
    });

    const cleaned = await cleanExpiredDeliveryMessages();
    expect(cleaned).toBeGreaterThanOrEqual(1);

    const updated = await getMessageById(msg.id);
    expect(updated!.whatsapp_message).toBeNull();
    // Body and subject should be untouched (inbox message preserved)
    expect(updated!.subject).toBe('Expired cleanup test');
    expect(updated!.body).toBe('This should be cleaned up.');
  });
});

describe('sendNotification (WhatsApp queue integration)', () => {
  it('queues WhatsApp delivery when user has phone', async () => {
    // user-sarah has phone +447700900001
    const msg = await sendNotification({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Queue test',
      body: 'Should be queued for WhatsApp.',
    });

    expect(msg).not.toBeNull();
    expect(msg!.whatsapp_message).toBe('Queue test: Should be queued for WhatsApp.');
    expect(msg!.whatsapp_expires_at).toBeTruthy();
    expect(msg!.whatsapp_delivered_at).toBeNull();
    expect(msg!.whatsapp_attempts).toBe(0);
  });

  it('does not queue WhatsApp when user has no phone', async () => {
    // Create a user without a phone
    const db = getDb();
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, email, time_available, skills) VALUES (?, ?, ?, ?, ?)`,
      args: ['user-nophone', 'No Phone', 'nophone@example.com', '10min', ''],
    });

    const msg = await sendNotification({
      recipientId: 'user-nophone',
      type: 'general',
      subject: 'No WA queue',
      body: 'Should not be queued for WhatsApp.',
    });

    expect(msg).not.toBeNull();
    expect(msg!.whatsapp_message).toBeNull();
    expect(msg!.whatsapp_expires_at).toBeNull();
  });

  it('uses whatsAppSummary when provided', async () => {
    const msg = await sendNotification({
      recipientId: 'user-sarah',
      type: 'general',
      subject: 'Custom summary test',
      body: 'This is the full body that is longer.',
      whatsAppSummary: 'Short custom WA summary',
    });

    expect(msg).not.toBeNull();
    expect(msg!.whatsapp_message).toBe('Short custom WA summary');
  });
});
