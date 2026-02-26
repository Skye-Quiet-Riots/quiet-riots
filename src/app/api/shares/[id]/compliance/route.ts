import { z } from 'zod';
import { getSession } from '@/lib/session';
import { hasAnyRole } from '@/lib/queries/roles';
import { approveCompliance, rejectCompliance, forwardToSenior } from '@/lib/queries/shares';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

const complianceSchema = z.object({
  decision: z.enum(['approve', 'reject', 'forward_senior']),
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
 * POST /api/shares/[id]/compliance — Compliance Guide decision
 */
export async function POST(request: Request, context: RouteContext) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isCompliance = await hasAnyRole(userId, ['compliance_guide', 'administrator']);
  if (!isCompliance) return apiError('Compliance Guide role required', 403);

  const { allowed } = rateLimit(`share-compliance:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = complianceSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  switch (parsed.data.decision) {
    case 'approve': {
      const result = await approveCompliance(id, userId, parsed.data.notes);
      if (!result.success) return apiError(result.error || 'Approve failed', 400);
      return apiOk({ approved: true, certificateNumber: result.certificateNumber });
    }
    case 'reject': {
      if (!parsed.data.reason) return apiError('Rejection reason required', 400);
      const result = await rejectCompliance(id, userId, parsed.data.reason);
      if (!result.success) return apiError(result.error || 'Reject failed', 400);
      return apiOk({ rejected: true });
    }
    case 'forward_senior': {
      if (!parsed.data.notes) return apiError('Notes required for forwarding', 400);
      const result = await forwardToSenior(id, userId, parsed.data.notes);
      if (!result.success) return apiError(result.error || 'Forward failed', 400);
      return apiOk({ forwarded: true });
    }
  }
}
