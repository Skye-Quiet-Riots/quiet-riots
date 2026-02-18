import { getTrendingReels } from '@/lib/queries/reels';
import { apiOk } from '@/lib/api-response';

export async function GET() {
  const reels = await getTrendingReels(10);
  return apiOk(reels);
}
