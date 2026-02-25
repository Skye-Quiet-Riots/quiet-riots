import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import {
  createMessage,
  getMessages,
  getMessageById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
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
