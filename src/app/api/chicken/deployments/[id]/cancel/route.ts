import { getSession } from '@/lib/session';
import { cancelChickenDeployment } from '@/lib/queries/chicken';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Props) {
  const userId = await getSession();
  if (!userId) return apiError('Not logged in', 401);

  const { allowed } = rateLimit(`chicken-cancel:${userId}`);
  if (!allowed) return apiError('Too many requests', 429);

  const { id } = await params;
  const result = await cancelChickenDeployment(id, userId);
  if (!result.success) {
    const status = result.error === 'Deployment not found' ? 404 : 400;
    return apiError(result.error!, status);
  }

  return apiOk({ cancelled: true });
}
