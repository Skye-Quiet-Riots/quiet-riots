import { NextRequest } from 'next/server';
import { getSuggestionById } from '@/lib/queries/suggestions';
import { hasRole } from '@/lib/queries/roles';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { generateHeroImage } from '@/lib/image-generation';

/**
 * POST /api/suggestions/:id/generate-image
 * Generate a DALL-E hero image for the entity linked to this suggestion.
 * Requires Setup Guide or Administrator role.
 * Rate limited to 1 per 30s per IP.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isGuide = await hasRole(userId, 'setup_guide');
  const isAdmin = await hasRole(userId, 'administrator');
  if (!isGuide && !isAdmin) return apiError('Setup Guide role required', 403);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`generate-image:${ip}`, { maxRequests: 2, windowMs: 60_000 });
  if (!allowed) return apiError('Too many requests — image generation is rate limited', 429);

  const { id } = await params;
  const suggestion = await getSuggestionById(id);
  if (!suggestion) return apiError('Suggestion not found', 404);

  // Determine the linked entity
  let entityType: 'issue' | 'organisation';
  let entityId: string;

  if (suggestion.issue_id) {
    entityType = 'issue';
    entityId = suggestion.issue_id;
  } else if (suggestion.organisation_id) {
    entityType = 'organisation';
    entityId = suggestion.organisation_id;
  } else {
    return apiError('No linked entity — suggestion must be approved first');
  }

  const result = await generateHeroImage(entityType, entityId, suggestion.suggested_name);

  if (!result.success) {
    return apiError(result.error ?? 'Image generation failed', 500);
  }

  return apiOk({
    heroUrl: result.heroUrl,
    thumbUrl: result.thumbUrl,
  });
}
