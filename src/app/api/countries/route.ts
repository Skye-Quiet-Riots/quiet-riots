import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { apiOk } from '@/lib/api-response';
import { translateCountryNames } from '@/lib/queries/translate';
import { isValidLocale } from '@/i18n/locales';

export async function GET(request: NextRequest) {
  const rawLocale = request.nextUrl.searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : 'en';

  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT code, name FROM countries ORDER BY name',
    args: [],
  });

  const rawCountries = result.rows.map((row) => ({
    code: row.code as string,
    name: row.name as string,
  }));

  const countries = translateCountryNames(rawCountries, locale);

  const response = apiOk(countries);
  // Include locale in Vary header to prevent CDN cross-locale cache pollution
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  response.headers.set('Vary', 'Accept-Encoding');
  return response;
}
