import { NextRequest } from 'next/server';
import { getTrendingReels } from '@/lib/queries/reels';
import { translateRiotReels } from '@/lib/queries/translate';
import { isValidLocale } from '@/i18n/locales';
import { apiOk } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const rawLocale = request.nextUrl.searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : undefined;

  const rawReels = await getTrendingReels(10);
  const reels = locale ? await translateRiotReels(rawReels, locale) : rawReels;
  return apiOk(reels);
}
