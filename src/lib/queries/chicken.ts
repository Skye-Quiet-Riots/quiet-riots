import { getDb } from '../db';
import { generateId } from '@/lib/uuid';
import type {
  ChickenPricing,
  ChickenDeployment,
  ChickenDeploymentWithDetails,
  ChickenDeploymentStatus,
  ChickenFulfiller,
  Wallet,
} from '@/types';

// --- Pricing ---

export async function getChickenPricing(countryCode: string): Promise<ChickenPricing | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM chicken_pricing WHERE country_code = ? AND active = 1 LIMIT 1',
    args: [countryCode],
  });
  if (result.rows[0]) return result.rows[0] as unknown as ChickenPricing;
  // Fallback to GB pricing
  const fallback = await db.execute({
    sql: "SELECT * FROM chicken_pricing WHERE country_code = 'GB' AND active = 1 LIMIT 1",
    args: [],
  });
  return (fallback.rows[0] as unknown as ChickenPricing) ?? null;
}

export async function getAllChickenPricing(): Promise<ChickenPricing[]> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM chicken_pricing WHERE active = 1 ORDER BY country_code',
    args: [],
  });
  return result.rows as unknown as ChickenPricing[];
}

// --- Deployments ---

export async function createChickenDeployment(params: {
  userId: string;
  issueId?: string;
  organisationId?: string;
  targetName: string;
  targetRole?: string;
  targetAddress: string;
  targetCity: string;
  targetCountry: string;
  messageText: string;
  pricingId: string;
  amountPaidPence: number;
  currency: string;
  expressDelivery: boolean;
}): Promise<ChickenDeployment> {
  const db = getDb();

  // Verify wallet has sufficient funds
  const walletResult = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [params.userId],
  });
  const wallet = walletResult.rows[0] as unknown as Wallet | undefined;
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance_pence < params.amountPaidPence) throw new Error('Insufficient funds');

  const deploymentId = generateId();
  const txId = generateId();

  // Estimated delivery: 5 business days, 2 for express
  const deliveryDays = params.expressDelivery ? 2 : 5;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);
  const estimatedDateStr = estimatedDate.toISOString().split('T')[0];

  // Atomic: debit wallet + create deployment + record transaction
  await db.batch([
    {
      sql: `UPDATE wallets SET
              balance_pence = balance_pence - ?,
              total_spent_pence = total_spent_pence + ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [params.amountPaidPence, params.amountPaidPence, wallet.id],
    },
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, currency_code, completed_at, description)
            VALUES (?, ?, 'payment', ?, ?, datetime('now'), ?)`,
      args: [
        txId,
        wallet.id,
        params.amountPaidPence,
        params.currency,
        `Deploy a Chicken: ${params.targetName}`,
      ],
    },
    {
      sql: `INSERT INTO chicken_deployments (
              id, user_id, issue_id, organisation_id,
              target_name, target_role, target_address, target_city, target_country,
              message_text, pricing_id, amount_paid_pence, currency,
              express_delivery, estimated_delivery_date, wallet_transaction_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        deploymentId,
        params.userId,
        params.issueId || null,
        params.organisationId || null,
        params.targetName,
        params.targetRole || null,
        params.targetAddress,
        params.targetCity,
        params.targetCountry,
        params.messageText,
        params.pricingId,
        params.amountPaidPence,
        params.currency,
        params.expressDelivery ? 1 : 0,
        estimatedDateStr,
        txId,
      ],
    },
  ]);

  const result = await db.execute({
    sql: 'SELECT * FROM chicken_deployments WHERE id = ?',
    args: [deploymentId],
  });
  return result.rows[0] as unknown as ChickenDeployment;
}

export async function getChickenDeployment(id: string): Promise<ChickenDeploymentWithDetails | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT cd.*,
            i.name as issue_name,
            o.name as organisation_name,
            cf.name as fulfiller_name
          FROM chicken_deployments cd
          LEFT JOIN issues i ON cd.issue_id = i.id
          LEFT JOIN organisations o ON cd.organisation_id = o.id
          LEFT JOIN chicken_fulfillers cf ON cd.fulfiller_id = cf.id
          WHERE cd.id = ?`,
    args: [id],
  });
  return (result.rows[0] as unknown as ChickenDeploymentWithDetails) ?? null;
}

export async function getUserChickenDeployments(
  userId: string,
  limit = 20,
): Promise<ChickenDeploymentWithDetails[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT cd.*,
            i.name as issue_name,
            o.name as organisation_name,
            cf.name as fulfiller_name
          FROM chicken_deployments cd
          LEFT JOIN issues i ON cd.issue_id = i.id
          LEFT JOIN organisations o ON cd.organisation_id = o.id
          LEFT JOIN chicken_fulfillers cf ON cd.fulfiller_id = cf.id
          WHERE cd.user_id = ?
          ORDER BY cd.created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows as unknown as ChickenDeploymentWithDetails[];
}

export async function updateChickenDeploymentStatus(
  id: string,
  status: ChickenDeploymentStatus,
  extras?: {
    fulfillerNotes?: string;
    proofPhotoUrl?: string;
    fulfillerId?: string;
  },
): Promise<ChickenDeployment | null> {
  const db = getDb();

  const sets = ["status = ?", "updated_at = datetime('now')"];
  const args: (string | null)[] = [status];

  if (status === 'delivered') {
    sets.push("delivered_at = datetime('now')");
  }
  if (status === 'cancelled') {
    sets.push("cancelled_at = datetime('now')");
  }
  if (extras?.fulfillerNotes) {
    sets.push('fulfiller_notes = ?');
    args.push(extras.fulfillerNotes);
  }
  if (extras?.proofPhotoUrl) {
    sets.push('proof_photo_url = ?');
    args.push(extras.proofPhotoUrl);
  }
  if (extras?.fulfillerId) {
    sets.push('fulfiller_id = ?');
    args.push(extras.fulfillerId);
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE chicken_deployments SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });

  return getChickenDeployment(id) as Promise<ChickenDeploymentWithDetails | null>;
}

export async function cancelChickenDeployment(
  id: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  const deployment = await getChickenDeployment(id);
  if (!deployment) return { success: false, error: 'Deployment not found' };
  if (deployment.user_id !== userId) return { success: false, error: 'Not your deployment' };
  if (deployment.status !== 'paid') {
    return { success: false, error: 'Can only cancel deployments that have not been accepted yet' };
  }

  // Refund: credit wallet + update deployment status + record refund transaction
  const walletResult = await db.execute({
    sql: 'SELECT * FROM wallets WHERE user_id = ?',
    args: [userId],
  });
  const wallet = walletResult.rows[0] as unknown as Wallet | undefined;
  if (!wallet) return { success: false, error: 'Wallet not found' };

  const refundTxId = generateId();

  await db.batch([
    {
      sql: `UPDATE wallets SET
              balance_pence = balance_pence + ?,
              total_spent_pence = total_spent_pence - ?,
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [deployment.amount_paid_pence, deployment.amount_paid_pence, wallet.id],
    },
    {
      sql: `INSERT INTO wallet_transactions (id, wallet_id, type, amount_pence, currency_code, completed_at, description)
            VALUES (?, ?, 'refund', ?, ?, datetime('now'), ?)`,
      args: [
        refundTxId,
        wallet.id,
        deployment.amount_paid_pence,
        deployment.currency,
        `Chicken deployment cancelled: ${deployment.target_name}`,
      ],
    },
    {
      sql: `UPDATE chicken_deployments SET
              status = 'cancelled',
              cancelled_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [id],
    },
  ]);

  return { success: true };
}

// --- Fulfillers ---

export async function getActiveFulfillers(countryCode?: string): Promise<ChickenFulfiller[]> {
  const db = getDb();
  if (countryCode) {
    const result = await db.execute({
      sql: 'SELECT * FROM chicken_fulfillers WHERE active = 1 AND country_code = ? ORDER BY rating DESC',
      args: [countryCode],
    });
    return result.rows as unknown as ChickenFulfiller[];
  }
  const result = await db.execute({
    sql: 'SELECT * FROM chicken_fulfillers WHERE active = 1 ORDER BY rating DESC',
    args: [],
  });
  return result.rows as unknown as ChickenFulfiller[];
}
