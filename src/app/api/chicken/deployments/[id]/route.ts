import { getSession } from '@/lib/session';
import { getChickenDeployment } from '@/lib/queries/chicken';
import { apiOk, apiError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { id } = await params;
  const deployment = await getChickenDeployment(id);
  if (!deployment) return apiError('Deployment not found', 404);
  if (deployment.user_id !== userId) return apiError('Not your deployment', 403);

  return apiOk(deployment);
}
