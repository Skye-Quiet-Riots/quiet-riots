import { z } from 'zod';
import { getReelsForIssue, createReel } from '@/lib/queries/reels';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { extractVideoId, getThumbnailUrl, getVideoMetadata } from '@/lib/youtube';

const submitReelSchema = z.object({
  youtube_url: z.string().min(1, 'YouTube URL required'),
  caption: z
    .string()
    .max(500)
    .optional()
    .default('')
    .transform((s) => s.trim()),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reels = await getReelsForIssue(id);
  return apiOk(reels);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`reel:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  const body = await request.json();
  const parsed = submitReelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message);
  }

  const videoId = extractVideoId(parsed.data.youtube_url);
  if (!videoId) {
    return apiError('Invalid YouTube URL');
  }

  // Try to fetch metadata from oEmbed
  const metadata = await getVideoMetadata(videoId);

  const reel = await createReel({
    issueId: id,
    youtubeUrl: parsed.data.youtube_url,
    youtubeVideoId: videoId,
    title: metadata?.title ?? '',
    thumbnailUrl: metadata?.thumbnail_url ?? getThumbnailUrl(videoId),
    durationSeconds: null,
    caption: parsed.data.caption,
    submittedBy: userId,
    source: 'community',
    status: 'pending',
  });

  return apiOk(reel);
}
