import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUnreadCount } from '@/lib/queries/messages';
import { getUserRoles } from '@/lib/queries/roles';
import { getWalletByUserId } from '@/lib/queries/wallet';
import { withTimeout } from '@/lib/db';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * GET /api/users/me/nav-context
 *
 * Consolidated endpoint returning everything the nav bar needs in a single fetch:
 * - unread message count
 * - user roles
 * - wallet balance + currency
 *
 * Security: user ID derived exclusively from session cookie.
 * Cache: private, no-store (personalised data).
 */
export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  try {
    const [unreadCount, roles, wallet] = await withTimeout(
      () =>
        Promise.all([
          getUnreadCount(userId),
          getUserRoles(userId),
          getWalletByUserId(userId),
        ]),
      3000,
    );

    const response = NextResponse.json(
      {
        ok: true,
        data: {
          unreadCount,
          roles: roles.map((r) => r.role),
          walletBalance: wallet?.balance_pence ?? null,
          walletCurrency: wallet?.currency ?? null,
        },
      },
      { status: 200 },
    );

    // Explicitly set cache headers — personalised data must never be cached publicly
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie');

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      return apiError('Request timed out', 504, 'INTERNAL_ERROR');
    }
    return apiError('Internal error', 500, 'INTERNAL_ERROR');
  }
}
