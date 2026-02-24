import { z } from 'zod';
import { getEvidenceComments, addEvidenceComment } from '@/lib/queries/evidence';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content required')
    .transform((s) => s.trim()),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { evidenceId } = await params;
  const comments = await getEvidenceComments(evidenceId);
  return apiOk(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { evidenceId } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`evidence-comment:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Content required');
  }

  if (!parsed.data.content) {
    return apiError('Content required');
  }

  const comment = await addEvidenceComment(evidenceId, userId, parsed.data.content);
  return apiOk(comment);
}
