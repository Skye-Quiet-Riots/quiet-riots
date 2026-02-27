import { NextResponse } from 'next/server';
import { getAllAssistants } from '@/lib/queries/assistants';
import { translateCategoryAssistants } from '@/lib/queries/translate';
import { isValidLocale } from '@/i18n/locales';

export async function GET(request: Request) {
  const rawLocale = new URL(request.url).searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : 'en';
  let assistants = await getAllAssistants();
  assistants = await translateCategoryAssistants(assistants, locale);
  return NextResponse.json(
    { ok: true, data: assistants },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
