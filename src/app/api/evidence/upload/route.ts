import { put } from '@vercel/blob';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { generateId } from '@/lib/uuid';

const DEV_FALLBACK_KEY = 'qr-bot-dev-key-2026';
const BOT_API_KEY = process.env.BOT_API_KEY || DEV_FALLBACK_KEY;
const IS_USING_DEV_KEY = !process.env.BOT_API_KEY;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

/** Derive file extension from validated MIME type — never trust the client filename */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export async function POST(request: NextRequest) {
  // 1. Auth: check Bearer token first (bot), then session cookie (web)
  const auth = request.headers.get('authorization');
  let rateLimitKey: string;

  if (
    auth === `Bearer ${BOT_API_KEY}` &&
    !(IS_USING_DEV_KEY && process.env.NODE_ENV === 'production')
  ) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    rateLimitKey = `upload:bot:${ip}`;
  } else if (auth?.startsWith('Bearer ')) {
    // Bearer token provided but invalid (or dev key in production)
    return apiError('Unauthorized', 401);
  } else {
    const userId = await getSession();
    if (!userId) {
      return apiError('Not logged in', 401);
    }
    rateLimitKey = `upload:${userId}`;
  }

  // 2. Rate limit
  const { allowed } = rateLimit(rateLimitKey);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

  // 3. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError('Invalid form data — expected multipart/form-data with a file field');
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return apiError('No file provided — include a "file" field in the form data');
  }

  // 4. Validate type
  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return apiError(
      `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM`,
    );
  }

  // 5. Validate size
  if (file.size > MAX_FILE_SIZE) {
    return apiError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 4MB`);
  }

  // 6. Generate unique blob path — derive extension from MIME type, not filename
  const ext = MIME_TO_EXT[file.type] || 'bin';
  const blobPath = `evidence/${generateId()}.${ext}`;

  // 7. Upload to Vercel Blob
  try {
    const blob = await put(blobPath, file, { access: 'public' });

    // 8. Return URL and metadata
    const mediaType = ALLOWED_IMAGE_TYPES.includes(file.type) ? 'photo' : 'video';
    return apiOk({ url: blob.url, mediaType, size: file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return apiError(`Upload failed: ${message}`, 500);
  }
}
