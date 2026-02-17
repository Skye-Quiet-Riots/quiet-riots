import { likeFeedPost } from '@/lib/queries/community';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`like:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  const { postId } = await params;
  await likeFeedPost(postId);
  return apiOk({ liked: true });
}
