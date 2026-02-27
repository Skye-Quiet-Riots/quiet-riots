import { NextRequest } from 'next/server';
import { getAllIssues } from '@/lib/queries/issues';
import { apiOk } from '@/lib/api-response';
import { trimAndLimit } from '@/lib/sanitize';
import { isValidLocale } from '@/i18n/locales';
import type { Category } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as Category | undefined;
  const rawSearch = searchParams.get('search');
  const search = rawSearch ? trimAndLimit(rawSearch, 500) : undefined;
  const rawLocale = searchParams.get('locale');
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : undefined;

  const issues = await getAllIssues(category || undefined, search, undefined, locale);
  return apiOk(issues);
}
