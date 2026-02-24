import { shareEvidence } from '@/lib/queries/evidence';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`evidence-share:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }
  const { evidenceId } = await params;
  await shareEvidence(evidenceId);
  return apiOk({ shared: true });
}
