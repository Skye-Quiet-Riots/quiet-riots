import { voteOnReel, hasVoted } from '@/lib/queries/reels';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; reelId: string }> },
) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`reel-vote:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const { reelId } = await params;

  const alreadyVoted = await hasVoted(reelId, userId);
  if (alreadyVoted) {
    return apiOk({ voted: true, already: true });
  }

  await voteOnReel(reelId, userId);
  return apiOk({ voted: true });
}
