import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getPersonalFeed, parseCursor } from '@/lib/queries/personal-feed';
import { translateEntities } from '@/lib/queries/translate';
import { apiError } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';

const cursorPattern = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?_[a-f0-9-]+$/;

const querySchema = z.object({
  cursor: z.string().max(100).regex(cursorPattern).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  // Rate limit: 20 req/min per user
  const rl = rateLimit(`personal-feed:${userId}`, { maxRequests: 20 });
  if (!rl.allowed) {
    return apiError('Too many requests', 429, 'RATE_LIMITED');
  }

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
    locale: searchParams.get('locale') || undefined,
  });

  if (!parsed.success) {
    return apiError('Invalid parameters', 400, 'VALIDATION_ERROR');
  }

  const { cursor, limit, locale } = parsed.data;

  // Validate cursor format if provided
  if (cursor) {
    const cursorParsed = parseCursor(cursor);
    if (!cursorParsed) {
      return apiError('Invalid cursor format', 400, 'VALIDATION_ERROR');
    }
  }

  const result = await getPersonalFeed(userId, cursor, limit);

  // Translate issue names if locale is provided and not English
  if (locale && locale !== 'en' && result.activities.length > 0) {
    // Build a map of unique issues to translate
    const issueIds = [...new Set(result.activities.map((a) => a.issue_id))];
    const issueEntities = issueIds.map((id) => ({
      id,
      name: result.activities.find((a) => a.issue_id === id)!.issue_name,
    }));
    const translated = await translateEntities(issueEntities, 'issue', locale);
    const nameMap = new Map(translated.map((t) => [t.id, t.name]));

    for (const activity of result.activities) {
      const translatedName = nameMap.get(activity.issue_id);
      if (translatedName) {
        activity.issue_name = translatedName;
      }
    }
  }

  const response = NextResponse.json(
    { ok: true, data: result },
    { status: 200 },
  );

  // Personalised data — never cache publicly
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');

  return response;
}
