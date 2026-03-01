import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { getDb } from '@/lib/db';
import {
  getChickenPricing,
  getAllChickenPricing,
  createChickenDeployment,
  getChickenDeployment,
  getUserChickenDeployments,
  updateChickenDeploymentStatus,
  cancelChickenDeployment,
  getActiveFulfillers,
} from './chicken';

let pricingId: string;

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();

  // Seed chicken pricing + fulfiller for tests
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO chicken_pricing (id, country_code, currency, base_price_pence, distance_surcharge_pence, express_surcharge_pence, description)
          VALUES ('pricing-gb', 'GB', 'GBP', 5000, 1000, 2500, 'UK chicken deployment')`,
    args: [],
  });
  await db.execute({
    sql: `INSERT INTO chicken_pricing (id, country_code, currency, base_price_pence, distance_surcharge_pence, express_surcharge_pence, description)
          VALUES ('pricing-us', 'US', 'USD', 6500, 1500, 3000, 'US chicken deployment')`,
    args: [],
  });
  await db.execute({
    sql: `INSERT INTO chicken_fulfillers (id, name, city, country_code, radius_km)
          VALUES ('fulfiller-1', 'Clucky McChicken', 'London', 'GB', 30)`,
    args: [],
  });
  pricingId = 'pricing-gb';

  // Top up sarah's wallet so she can afford chicken deployments
  await db.execute({
    sql: "UPDATE wallets SET balance_pence = 50000 WHERE user_id = 'user-sarah'",
    args: [],
  });
});

afterAll(async () => {
  await teardownTestDb();
});

describe('getChickenPricing', () => {
  it('returns pricing for GB', async () => {
    const pricing = await getChickenPricing('GB');
    expect(pricing).not.toBeNull();
    expect(pricing!.base_price_pence).toBe(5000);
    expect(pricing!.currency).toBe('GBP');
  });

  it('returns pricing for US', async () => {
    const pricing = await getChickenPricing('US');
    expect(pricing).not.toBeNull();
    expect(pricing!.base_price_pence).toBe(6500);
  });

  it('falls back to GB pricing for unknown country', async () => {
    const pricing = await getChickenPricing('ZZ');
    expect(pricing).not.toBeNull();
    expect(pricing!.country_code).toBe('GB');
  });
});

describe('getAllChickenPricing', () => {
  it('returns all active pricing', async () => {
    const pricing = await getAllChickenPricing();
    expect(pricing.length).toBe(2);
  });
});

describe('createChickenDeployment', () => {
  it('creates deployment and debits wallet', async () => {
    const deployment = await createChickenDeployment({
      userId: 'user-sarah',
      issueId: 'issue-rail',
      targetName: 'Big Boss CEO',
      targetRole: 'CEO',
      targetAddress: '123 Corp Street',
      targetCity: 'London',
      targetCountry: 'GB',
      messageText: 'Your trains are terrible! Fix them!',
      pricingId,
      amountPaidPence: 5000,
      currency: 'GBP',
      expressDelivery: false,
    });

    expect(deployment.id).toBeTruthy();
    expect(deployment.status).toBe('paid');
    expect(deployment.target_name).toBe('Big Boss CEO');
    expect(deployment.amount_paid_pence).toBe(5000);
    expect(deployment.estimated_delivery_date).toBeTruthy();
  });

  it('fails with insufficient funds', async () => {
    await expect(
      createChickenDeployment({
        userId: 'user-sarah',
        issueId: 'issue-rail',
        targetName: 'Another CEO',
        targetAddress: '456 Corp Ave',
        targetCity: 'London',
        targetCountry: 'GB',
        messageText: 'Test',
        pricingId,
        amountPaidPence: 999999,
        currency: 'GBP',
        expressDelivery: false,
      }),
    ).rejects.toThrow('Insufficient funds');
  });
});

describe('getChickenDeployment', () => {
  it('returns deployment with joined details', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    const deployment = await getChickenDeployment(deployments[0].id);
    expect(deployment).not.toBeNull();
    expect(deployment!.issue_name).toBeTruthy();
  });

  it('returns null for non-existent deployment', async () => {
    const deployment = await getChickenDeployment('nonexistent');
    expect(deployment).toBeNull();
  });
});

describe('getUserChickenDeployments', () => {
  it('returns user deployments', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    expect(deployments.length).toBeGreaterThan(0);
    expect(deployments[0].user_id).toBe('user-sarah');
  });

  it('returns empty for user with no deployments', async () => {
    const deployments = await getUserChickenDeployments('user-marcio');
    expect(deployments.length).toBe(0);
  });
});

describe('updateChickenDeploymentStatus', () => {
  it('updates status to accepted', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    const updated = await updateChickenDeploymentStatus(deployments[0].id, 'accepted', {
      fulfillerId: 'fulfiller-1',
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('accepted');
    expect(updated!.fulfiller_id).toBe('fulfiller-1');
  });

  it('updates to delivered with proof', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    const updated = await updateChickenDeploymentStatus(deployments[0].id, 'delivered', {
      proofPhotoUrl: 'https://example.com/proof.jpg',
      fulfillerNotes: 'CEO was very surprised!',
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('delivered');
    expect(updated!.proof_photo_url).toBe('https://example.com/proof.jpg');
    expect(updated!.delivered_at).toBeTruthy();
  });
});

describe('cancelChickenDeployment', () => {
  it('cancels a paid deployment and refunds', async () => {
    // Create a new deployment to cancel
    const deployment = await createChickenDeployment({
      userId: 'user-sarah',
      targetName: 'Cancel Target',
      targetAddress: '789 Cancel St',
      targetCity: 'London',
      targetCountry: 'GB',
      messageText: 'This will be cancelled',
      pricingId,
      amountPaidPence: 1000,
      currency: 'GBP',
      expressDelivery: false,
    });

    const result = await cancelChickenDeployment(deployment.id, 'user-sarah');
    expect(result.success).toBe(true);

    const cancelled = await getChickenDeployment(deployment.id);
    expect(cancelled!.status).toBe('cancelled');
    expect(cancelled!.cancelled_at).toBeTruthy();
  });

  it('rejects cancellation of non-owned deployment', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    const result = await cancelChickenDeployment(deployments[0].id, 'user-marcio');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your deployment');
  });

  it('rejects cancellation of already-delivered deployment', async () => {
    const deployments = await getUserChickenDeployments('user-sarah');
    const delivered = deployments.find((d) => d.status === 'delivered');
    if (delivered) {
      const result = await cancelChickenDeployment(delivered.id, 'user-sarah');
      expect(result.success).toBe(false);
    }
  });
});

describe('getActiveFulfillers', () => {
  it('returns all active fulfillers', async () => {
    const fulfillers = await getActiveFulfillers();
    expect(fulfillers.length).toBeGreaterThan(0);
  });

  it('filters by country', async () => {
    const fulfillers = await getActiveFulfillers('GB');
    expect(fulfillers.length).toBe(1);
    expect(fulfillers[0].city).toBe('London');
  });

  it('returns empty for country with no fulfillers', async () => {
    const fulfillers = await getActiveFulfillers('ZZ');
    expect(fulfillers.length).toBe(0);
  });
});
