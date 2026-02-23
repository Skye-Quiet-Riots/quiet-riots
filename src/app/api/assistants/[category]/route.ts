import { NextResponse } from 'next/server';
import { getAssistantDetail } from '@/lib/queries/assistants';
import { apiError } from '@/lib/api-response';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;

  if (!ASSISTANT_CATEGORIES.includes(category as AssistantCategory)) {
    return apiError('Invalid category', 400);
  }

  const detail = await getAssistantDetail(category);
  if (!detail) {
    return apiError('Assistant pair not found', 404);
  }

  return NextResponse.json(
    { ok: true, data: detail },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
