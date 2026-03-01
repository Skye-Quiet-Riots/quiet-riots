import { shareFeedPost } from '@/lib/queries/community';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`feed-share:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  const { postId } = await params;
  await shareFeedPost(postId);
  return apiOk({ shared: true });
}
