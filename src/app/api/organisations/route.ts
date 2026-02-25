import { NextRequest } from 'next/server';
import { getAllOrganisations } from '@/lib/queries/organisations';
import { apiOk } from '@/lib/api-response';
import { trimAndLimit } from '@/lib/sanitize';
import type { Category } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as Category | undefined;
  const rawSearch = searchParams.get('search');
  const search = rawSearch ? trimAndLimit(rawSearch, 500) : undefined;
  const locale = searchParams.get('locale') || undefined;

  const orgs = await getAllOrganisations(category || undefined, search, locale);
  return apiOk(orgs);
}
