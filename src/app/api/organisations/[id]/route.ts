import { NextResponse } from 'next/server';
import { getOrganisationById, getIssuesForOrg, getTotalRiotersForOrg } from '@/lib/queries/organisations';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganisationById(Number(id));
  if (!org) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
  }

  const issues = await getIssuesForOrg(org.id);
  const totalRioters = await getTotalRiotersForOrg(org.id);

  return NextResponse.json({ org, issues, totalRioters });
}
