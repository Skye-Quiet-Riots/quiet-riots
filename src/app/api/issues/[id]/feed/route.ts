import { z } from 'zod';
import { getFeedPosts, createFeedPost } from '@/lib/queries/community';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

const feedPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content required')
    .transform((s) => s.trim()),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posts = await getFeedPosts(id);
  return apiOk(posts);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`feed:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = feedPostSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Content required');
  }

  if (!parsed.data.content) {
    return apiError('Content required');
  }

  const post = await createFeedPost(id, userId, parsed.data.content);
  return apiOk(post);
}
