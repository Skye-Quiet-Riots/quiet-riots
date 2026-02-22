import { NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/queries/campaigns';
import { apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return apiError('Campaign not found', 404);
  }
  return NextResponse.json(
    { ok: true, data: campaign },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
