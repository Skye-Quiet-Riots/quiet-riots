import { z } from 'zod';
import { getEvidenceForIssue, createEvidence } from '@/lib/queries/evidence';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const evidenceSchema = z.object({
  content: z
    .string()
    .min(1, 'Content required')
    .max(5000)
    .transform((s) => sanitizeText(s)),
  org_id: z.string().max(64).nullable().optional(),
  media_type: z.enum(['text', 'photo', 'video', 'link', 'live_stream']).default('text'),
  photo_urls: z.array(z.string().url().max(2000)).max(4).optional().default([]),
  video_url: z.string().url().max(2000).nullable().optional(),
  external_urls: z.array(z.string().url().max(2000)).max(10).optional().default([]),
  live: z.boolean().optional().default(false),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org_id') || undefined;
  const evidence = await getEvidenceForIssue(id, orgId);
  return apiOk(evidence);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`evidence:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = evidenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Content required');
  }

  if (!parsed.data.content) {
    return apiError('Content required');
  }

  const evidence = await createEvidence({
    issueId: id,
    orgId: parsed.data.org_id ?? null,
    userId,
    content: parsed.data.content,
    mediaType: parsed.data.media_type,
    photoUrls: parsed.data.photo_urls,
    videoUrl: parsed.data.video_url ?? null,
    externalUrls: parsed.data.external_urls,
    live: parsed.data.live,
  });
  return apiOk(evidence);
}
