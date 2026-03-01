import { z } from 'zod';
import { getFeedPosts, createFeedPost } from '@/lib/queries/community';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const VERCEL_BLOB_PATTERN = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

const feedPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content required')
    .max(5000)
    .transform((s) => sanitizeText(s)),
  photo_urls: z
    .array(z.string().url().refine((url) => VERCEL_BLOB_PATTERN.test(url), 'Invalid photo URL'))
    .max(4)
    .optional()
    .default([]),
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

  const photoUrls = JSON.stringify(parsed.data.photo_urls);
  const post = await createFeedPost(id, userId, parsed.data.content, photoUrls);
  return apiOk(post);
}
