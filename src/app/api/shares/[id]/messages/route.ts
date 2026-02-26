import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { hasAnyRole, hasRole } from '@/lib/queries/roles';
import {
  getShareApplicationById,
  createShareMessage,
  getShareMessages,
} from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';
import type { ShareSenderRole } from '@/types';

const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message required')
    .max(5000)
    .transform((s) => sanitizeText(s)),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Determine the sender role and visibility role for the current user.
 */
async function getUserRole(
  userId: string,
  applicationUserId: string,
): Promise<ShareSenderRole | null> {
  if (userId === applicationUserId) return 'applicant';
  if (await hasRole(userId, 'administrator')) return 'senior_compliance';
  if (await hasAnyRole(userId, ['compliance_guide'])) return 'compliance_guide';
  if (await hasAnyRole(userId, ['share_guide'])) return 'share_guide';
  return null;
}

/**
 * GET /api/shares/[id]/messages — Role-filtered conversation thread
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { id } = await context.params;
  const app = await getShareApplicationById(id);
  if (!app) return apiError('Application not found', 404);

  const role = await getUserRole(userId, app.user_id);
  if (!role) return apiError('No access to this application', 403);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const messages = await getShareMessages(id, role, limit, offset);
  return apiOk({ messages });
}

/**
 * POST /api/shares/[id]/messages — Send message in conversation thread
 */
export async function POST(request: Request, context: RouteContext) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`share-msg:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await context.params;
  const app = await getShareApplicationById(id);
  if (!app) return apiError('Application not found', 404);

  const role = await getUserRole(userId, app.user_id);
  if (!role) return apiError('No access to this application', 403);

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const message = await createShareMessage(id, userId, role, parsed.data.content);
  return apiOk({ message }, 201);
}
