/**
 * Extract a YouTube video ID from various URL formats.
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
 * youtube.com/shorts/ID, youtube.com/live/ID
 * Returns null if no valid ID is found.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Build a thumbnail URL for a YouTube video.
 * Uses the public img.youtube.com endpoint (no API key needed).
 */
export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Fetch video metadata from YouTube oEmbed API (no API key needed).
 * Returns title, thumbnail_url, and author_name.
 * Returns null if the video is not found or the request fails.
 */
export async function getVideoMetadata(
  videoId: string,
): Promise<{ title: string; thumbnail_url: string; author_name: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || '',
      thumbnail_url: data.thumbnail_url || getThumbnailUrl(videoId),
      author_name: data.author_name || '',
    };
  } catch {
    return null;
  }
}
