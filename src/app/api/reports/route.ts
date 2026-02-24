import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { createReport } from '@/lib/queries/social';

const reportSchema = z.object({
  entityType: z.enum(['feed', 'evidence', 'reel', 'user']),
  entityId: z.string().min(1, 'Entity ID required'),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'inappropriate', 'other']),
  description: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`report:${ip}`, { maxRequests: 10, windowMs: 3_600_000 });
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const report = await createReport(
    userId,
    parsed.data.entityType,
    parsed.data.entityId,
    parsed.data.reason,
    parsed.data.description,
  );
  return apiOk(report, 201);
}
