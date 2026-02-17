import { NextRequest } from 'next/server';
import { getAllOrganisations } from '@/lib/queries/organisations';
import { apiOk } from '@/lib/api-response';
import type { Category } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as Category | undefined;
  const orgs = await getAllOrganisations(category || undefined);
  return apiOk(orgs);
}
