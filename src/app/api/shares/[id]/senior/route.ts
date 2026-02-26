import { z } from 'zod';
import { getSession } from '@/lib/session';
import { hasRole } from '@/lib/queries/roles';
import { approveSenior, rejectSenior } from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const seniorSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z
    .string()
    .max(2000)
    .transform((s) => sanitizeText(s))
    .optional(),
  reason: z
    .string()
    .max(1000)
    .transform((s) => sanitizeText(s))
    .optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/shares/[id]/senior — Senior Compliance decision (administrator only)
 */
export async function POST(request: Request, context: RouteContext) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  if (!isAdmin) return apiError('Administrator role required', 403);

  const { allowed } = rateLimit(`share-senior:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = seniorSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  if (parsed.data.decision === 'approve') {
    const result = await approveSenior(id, userId, parsed.data.notes);
    if (!result.success) return apiError(result.error || 'Approve failed', 400);
    return apiOk({ approved: true, certificateNumber: result.certificateNumber });
  } else {
    if (!parsed.data.reason) return apiError('Rejection reason required', 400);
    const result = await rejectSenior(id, userId, parsed.data.reason);
    if (!result.success) return apiError(result.error || 'Reject failed', 400);
    return apiOk({ rejected: true });
  }
}
