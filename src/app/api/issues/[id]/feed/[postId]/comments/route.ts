import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getFeedComments, addFeedComment } from '@/lib/queries/community';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content required')
    .max(2000)
    .transform((s) => sanitizeText(s)),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { postId } = await params;
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

  const comments = await getFeedComments(postId, limit);
  const res = NextResponse.json({ ok: true, data: comments });
  res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { postId } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`feed-comment:${userId}`, { maxRequests: 10, windowMs: 60_000 });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await _request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Content required');
  }

  if (!parsed.data.content) {
    return apiError('Content required');
  }

  const comment = await addFeedComment(postId, userId, parsed.data.content);
  return apiOk(comment);
}
