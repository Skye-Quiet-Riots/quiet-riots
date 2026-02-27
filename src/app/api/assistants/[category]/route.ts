import { NextResponse } from 'next/server';
import { getAssistantDetail } from '@/lib/queries/assistants';
import { apiError } from '@/lib/api-response';
import { translateCategoryAssistant, translateEntities } from '@/lib/queries/translate';
import { isValidLocale } from '@/i18n/locales';
import { ASSISTANT_CATEGORIES } from '@/types';
import type { AssistantCategory } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category: rawCategory } = await params;
  const category = rawCategory.toLowerCase();
  const rawLocale = new URL(request.url).searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : 'en';

  if (!ASSISTANT_CATEGORIES.includes(category as AssistantCategory)) {
    return apiError('Invalid category', 400);
  }

  const detail = await getAssistantDetail(category);
  if (!detail) {
    return apiError('Assistant pair not found', 404);
  }

  const translatedDetail = await translateCategoryAssistant(detail, locale);
  const translatedRiots = await translateEntities(
    detail.riots as ((typeof detail.riots)[number] & { description?: string | null })[],
    'issue',
    locale,
  );

  return NextResponse.json(
    { ok: true, data: { ...translatedDetail, riots: translatedRiots } },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
