import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateChickenDeploymentStatus } from '@/lib/queries/chicken';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import type { ChickenDeploymentStatus } from '@/types';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_DEV_KEY = !process.env.BOT_API_KEY || process.env.BOT_API_KEY === DEV_FALLBACK_KEY;

const statusSchema = z.object({
  status: z.enum(['accepted', 'in_progress', 'delivered', 'cancelled', 'refunded', 'disputed']),
  fulfiller_id: z.string().max(64).optional(),
  fulfiller_notes: z.string().max(1000).optional(),
  proof_photo_url: z.string().url().max(2000).optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${BOT_API_KEY}` || (IS_DEV_KEY && process.env.NODE_ENV === 'production')) {
    return apiError('Unauthorized', 401);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`chicken-status:${ip}`);
  if (!allowed) return apiError('Too many requests', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.issues);

  const { id } = await params;
  const updated = await updateChickenDeploymentStatus(
    id,
    parsed.data.status as ChickenDeploymentStatus,
    {
      fulfillerId: parsed.data.fulfiller_id,
      fulfillerNotes: parsed.data.fulfiller_notes,
      proofPhotoUrl: parsed.data.proof_photo_url,
    },
  );

  if (!updated) return apiError('Deployment not found', 404);
  return apiOk(updated);
}
