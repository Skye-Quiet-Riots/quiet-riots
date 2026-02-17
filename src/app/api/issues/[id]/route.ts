import { getIssueById } from '@/lib/queries/issues';
import { getCommunityHealth, getCountryBreakdown } from '@/lib/queries/community';
import { getOrgsForIssue } from '@/lib/queries/organisations';
import { getSeasonalPattern } from '@/lib/queries/seasonal-patterns';
import { getRelatedIssues } from '@/lib/queries/issue-relations';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) {
    return apiError('Issue not found', 404);
  }

  const [health, countries, pivotOrgs, seasonalPattern, relatedIssues] = await Promise.all([
    getCommunityHealth(issue.id),
    getCountryBreakdown(issue.id),
    getOrgsForIssue(issue.id),
    getSeasonalPattern(issue.id),
    getRelatedIssues(issue.id),
  ]);

  return apiOk({ issue, health, countries, pivotOrgs, seasonalPattern, relatedIssues });
}
