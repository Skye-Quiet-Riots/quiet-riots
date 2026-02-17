import {
  getOrganisationById,
  getIssuesForOrg,
  getTotalRiotersForOrg,
} from '@/lib/queries/organisations';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganisationById(Number(id));
  if (!org) {
    return apiError('Organisation not found', 404);
  }

  const issues = await getIssuesForOrg(org.id);
  const totalRioters = await getTotalRiotersForOrg(org.id);

  return apiOk({ org, issues, totalRioters });
}
