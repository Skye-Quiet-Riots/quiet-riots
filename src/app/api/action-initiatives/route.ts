import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActionInitiatives, createActionInitiative } from '@/lib/queries/action-initiatives';
import { generateAndStoreTranslations } from '@/lib/queries/generate-translations';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import type { ActionInitiativeStatus } from '@/types';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_DEV_KEY = !process.env.BOT_API_KEY || process.env.BOT_API_KEY === DEV_FALLBACK_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const issueId = searchParams.get('issue_id') || undefined;
  const status = (searchParams.get('status') as ActionInitiativeStatus) || undefined;

  const actionInitiatives = await getActionInitiatives(issueId, status);
  return NextResponse.json(
    { ok: true, data: actionInitiatives },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}

const createActionInitiativeSchema = z.object({
  issue_id: z.string().min(1, 'Issue ID required'),
  org_id: z.string().optional(),
  title: z.string().min(1, 'Title required'),
  description: z.string().optional().default(''),
  target_pence: z.number().int().min(100, 'Minimum target is £1'),
  recipient: z.string().optional(),
  recipient_url: z.string().optional(),
  service_fee_pct: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: NextRequest) {
  // Only bot can create action initiatives — reject dev key in production
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${BOT_API_KEY}` || (IS_DEV_KEY && process.env.NODE_ENV === 'production')) {
    return apiError('Unauthorized', 401);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`create-action-initiative:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = createActionInitiativeSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const actionInitiative = await createActionInitiative({
    issueId: parsed.data.issue_id,
    orgId: parsed.data.org_id,
    title: parsed.data.title,
    description: parsed.data.description,
    targetPence: parsed.data.target_pence,
    recipient: parsed.data.recipient,
    recipientUrl: parsed.data.recipient_url,
    serviceFeePct: parsed.data.service_fee_pct,
  });

  // Fire-and-forget: generate translations for action initiative title/description
  const fields: Record<string, string> = { title: parsed.data.title };
  if (parsed.data.description) fields.description = parsed.data.description;
  generateAndStoreTranslations('action_initiative', actionInitiative.id, fields).catch(() => {});

  return apiOk(actionInitiative, 201);
}
