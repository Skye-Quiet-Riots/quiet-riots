import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { hasAnyRole, hasRole } from '@/lib/queries/roles';
import { getApplicationsForReview } from '@/lib/queries/shares';
import { apiOk, apiError } from '@/lib/api-response';
import type { ShareStatus } from '@/types';

/**
 * GET /api/shares/queue — Guide inbox (filtered by role)
 */
export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const isAdmin = await hasRole(userId, 'administrator');
  const isShareGuide = await hasAnyRole(userId, ['share_guide']);
  const isComplianceGuide = await hasAnyRole(userId, ['compliance_guide']);

  if (!isAdmin && !isShareGuide && !isComplianceGuide) {
    return apiError('Guide role required', 403);
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const statusFilter = url.searchParams.get('status') as ShareStatus | null;

  // Determine which statuses this role can see
  let statuses: ShareStatus[];
  if (statusFilter) {
    statuses = [statusFilter];
  } else if (isAdmin) {
    statuses = [
      'under_review',
      'approved',
      'identity_submitted',
      'forwarded_senior',
      'issued',
      'rejected',
    ];
  } else if (isComplianceGuide) {
    statuses = ['identity_submitted', 'forwarded_senior'];
  } else {
    // Share Guide
    statuses = ['under_review'];
  }

  const applications = await getApplicationsForReview(statuses, limit, offset);
  return apiOk({ applications });
}
