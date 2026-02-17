import { z } from 'zod';
import { getSynonymsForIssue, addSynonym } from '@/lib/queries/synonyms';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

const synonymSchema = z.object({
  term: z
    .string()
    .min(1, 'Term required')
    .transform((s) => s.trim()),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const synonyms = await getSynonymsForIssue(Number(id));
  return apiOk(synonyms);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = rateLimit(`synonym:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = synonymSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Term required');
  }

  if (!parsed.data.term) {
    return apiError('Term required');
  }

  const synonym = await addSynonym(Number(id), parsed.data.term);
  return apiOk(synonym);
}
