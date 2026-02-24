import { getEvidenceForOrg } from '@/lib/queries/evidence';
import { apiOk } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evidence = await getEvidenceForOrg(id);
  return apiOk(evidence);
}
