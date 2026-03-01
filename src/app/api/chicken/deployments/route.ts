import { getSession } from '@/lib/session';
import { getUserChickenDeployments } from '@/lib/queries/chicken';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET() {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const deployments = await getUserChickenDeployments(userId);
  return apiOk(deployments);
}
