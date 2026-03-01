import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import { createChickenDeployment } from '@/lib/queries/chicken';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';

const deploySchema = z.object({
  issue_id: z.string().max(64).optional(),
  organisation_id: z.string().max(64).optional(),
  target_name: z.string().min(1, 'Target name is required').max(200),
  target_role: z.string().max(200).optional(),
  target_address: z.string().min(1, 'Address is required').max(500),
  target_city: z.string().min(1, 'City is required').max(200),
  target_country: z.string().min(2).max(2, 'Country must be 2-letter code'),
  message_text: z.string().min(1, 'Message is required').max(500),
  pricing_id: z.string().min(1, 'Pricing ID is required').max(64),
  amount_paid_pence: z.number().int().min(100, 'Minimum amount is 100 pence'),
  currency: z.string().min(3).max(3),
  express_delivery: z.boolean().default(false),
});

export async function POST(request: Request) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const user = await getUserById(userId);
  if (!user) return apiError('User not found', 401);

  const { allowed } = rateLimit(`chicken-deploy:${userId}`, {
    maxRequests: 5,
    windowMs: 3600_000,
  });
  if (!allowed) return apiError('Too many requests', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = deploySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  try {
    const deployment = await createChickenDeployment({
      userId,
      issueId: parsed.data.issue_id,
      organisationId: parsed.data.organisation_id,
      targetName: parsed.data.target_name,
      targetRole: parsed.data.target_role,
      targetAddress: parsed.data.target_address,
      targetCity: parsed.data.target_city,
      targetCountry: parsed.data.target_country,
      messageText: parsed.data.message_text,
      pricingId: parsed.data.pricing_id,
      amountPaidPence: parsed.data.amount_paid_pence,
      currency: parsed.data.currency,
      expressDelivery: parsed.data.express_delivery,
    });

    return apiOk(deployment, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Deployment failed';
    if (message === 'Insufficient funds') return apiError(message, 400);
    if (message === 'Wallet not found') return apiError(message, 404);
    throw e;
  }
}
