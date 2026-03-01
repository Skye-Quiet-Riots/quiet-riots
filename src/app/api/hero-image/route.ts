import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { generateHeroImage } from '@/lib/image-generation';

const schema = z.object({
  entityType: z.enum(['issue', 'organisation']),
  entityId: z.string().min(1),
  entityName: z.string().min(1),
});

/**
 * POST /api/hero-image
 * Generate a DALL-E hero image for any entity.
 * Requires Administrator role.
 * Rate limited to 2 per 60s per IP.
 */
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`hero-image:${ip}`, { maxRequests: 2, windowMs: 60_000 });
  if (!allowed) return apiError('Too many requests — image generation is rate limited', 429);

  const body = await request.json().catch(() => null);
  if (!body) return apiError('Invalid JSON body');

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { entityType, entityId, entityName } = parsed.data;
  const result = await generateHeroImage(entityType, entityId, entityName);

  if (!result.success) {
    return apiError(result.error ?? 'Image generation failed', 500);
  }

  return apiOk({
    heroUrl: result.heroUrl,
    thumbUrl: result.thumbUrl,
  });
}
