import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { getMessages, getUnreadCount } from '@/lib/queries/messages';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const [messages, unreadCount] = await Promise.all([
    getMessages(userId, { unreadOnly, limit, offset }),
    getUnreadCount(userId),
  ]);

  return apiOk({ messages, unread_count: unreadCount });
}
