import { getSession } from '@/lib/session';
import {
  getOrCreateShareApplication,
  checkShareEligibility,
  promoteToEligible,
} from '@/lib/queries/shares';
import { getOrCreateWallet } from '@/lib/queries/wallet';
import { apiOk, apiError } from '@/lib/api-response';

/**
 * GET /api/shares — User's share status + eligibility (strips guide IDs/notes)
 */
export async function GET() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  let application = await getOrCreateShareApplication(userId);
  const eligibility = await checkShareEligibility(userId);

  // Auto-promote to 'available' if user meets eligibility criteria
  if (application.status === 'not_eligible' && eligibility.eligible) {
    const promoted = await promoteToEligible(userId);
    if (promoted) {
      application = await getOrCreateShareApplication(userId);
    }
  }

  let walletBalance = 0;
  try {
    const wallet = await getOrCreateWallet(userId);
    walletBalance = wallet.balance_pence;
  } catch {
    // Wallet not available — non-critical
  }

  // Strip guide internals from user-facing response
  return apiOk({
    application: {
      id: application.id,
      status: application.status,
      certificate_number: application.certificate_number,
      issued_at: application.issued_at,
      reapply_count: application.reapply_count,
      eligible_at: application.eligible_at,
      created_at: application.created_at,
    },
    eligibility,
    walletBalance,
    paymentRequired: 10,
  });
}
