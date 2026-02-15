import { NextResponse } from 'next/server';
import { getIssueById } from '@/lib/queries/issues';
import { getCommunityHealth, getCountryBreakdown } from '@/lib/queries/community';
import { getOrgsForIssue } from '@/lib/queries/organisations';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = getIssueById(Number(id));
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const health = getCommunityHealth(issue.id);
  const countries = getCountryBreakdown(issue.id);
  const pivotOrgs = getOrgsForIssue(issue.id);

  return NextResponse.json({ issue, health, countries, pivotOrgs });
}
