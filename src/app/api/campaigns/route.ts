import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCampaigns, createCampaign } from '@/lib/queries/campaigns';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError, apiValidationError } from '@/lib/api-response';
import type { CampaignStatus } from '@/types';

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const issueId = searchParams.get('issue_id') || undefined;
  const status = (searchParams.get('status') as CampaignStatus) || undefined;

  const campaigns = await getCampaigns(issueId, status);
  return NextResponse.json(
    { ok: true, data: campaigns },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}

const createCampaignSchema = z.object({
  issue_id: z.string().min(1, 'Issue ID required'),
  org_id: z.string().optional(),
  title: z.string().min(1, 'Title required'),
  description: z.string().optional().default(''),
  target_pence: z.number().int().min(100, 'Minimum target is £1'),
  recipient: z.string().optional(),
  recipient_url: z.string().optional(),
  platform_fee_pct: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: NextRequest) {
  // Only bot can create campaigns
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${BOT_API_KEY}`) {
    return apiError('Unauthorized', 401);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(`create-campaign:${ip}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const campaign = await createCampaign({
    issueId: parsed.data.issue_id,
    orgId: parsed.data.org_id,
    title: parsed.data.title,
    description: parsed.data.description,
    targetPence: parsed.data.target_pence,
    recipient: parsed.data.recipient,
    recipientUrl: parsed.data.recipient_url,
    platformFeePct: parsed.data.platform_fee_pct,
  });
  return apiOk(campaign, 201);
}
