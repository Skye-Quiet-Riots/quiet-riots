import { NextRequest, NextResponse } from 'next/server';
import { getAssistantActivity, getAssistantByCategory } from '@/lib/queries/assistants';
import { apiError } from '@/lib/api-response';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;

  if (!ASSISTANT_CATEGORIES.includes(category as AssistantCategory)) {
    return apiError('Invalid category', 400);
  }

  const assistant = await getAssistantByCategory(category);
  if (!assistant) {
    return apiError('Assistant pair not found', 404);
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const type = searchParams.get('type') as 'agent' | 'human' | null;

  const activity = await getAssistantActivity(
    category,
    limit,
    offset,
    type || undefined,
  );

  return NextResponse.json(
    { ok: true, data: activity },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
