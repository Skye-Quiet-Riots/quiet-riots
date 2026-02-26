import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { hasAnyRole } from '@/lib/queries/roles';
import { getTreasuryTransactions, getTreasuryBalance, getShareStats } from '@/lib/queries/shares';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * GET /api/shares/treasury — Treasury transaction log
 */
export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const hasAccess = await hasAnyRole(userId, ['treasury_guide', 'administrator']);
  if (!hasAccess) return apiError('Treasury Guide role required', 403);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const [transactions, balance, stats] = await Promise.all([
    getTreasuryTransactions(limit, offset),
    getTreasuryBalance(),
    getShareStats(),
  ]);

  return apiOk({ transactions, balance, stats });
}
