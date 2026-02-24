import { likeEvidence } from '@/lib/queries/evidence';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`evidence-like:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  const { evidenceId } = await params;
  await likeEvidence(evidenceId);
  return apiOk({ liked: true });
}
