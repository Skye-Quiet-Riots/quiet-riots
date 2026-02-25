import { put, del } from '@vercel/blob';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { apiOk, apiError } from '@/lib/api-response';
import { getUserById, updateUser } from '@/lib/queries/users';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const { allowed } = rateLimit(`avatar:${userId}`);
  if (!allowed) {
    return apiError('Too many requests', 429);
  }

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

  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP`);
  }

  if (file.size > MAX_FILE_SIZE) {
    return apiError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 2MB`);
  }

  // Delete old avatar blob if it exists
  const user = await getUserById(userId);
  if (user?.avatar_url && user.avatar_url.includes('blob.vercel-storage.com')) {
    try {
      await del(user.avatar_url);
    } catch {
      // Non-fatal — old blob may have already been deleted
    }
  }

  const ext = MIME_TO_EXT[file.type] || 'jpg';
  const blobPath = `avatars/${userId}.${ext}`;

  try {
    const blob = await put(blobPath, file, { access: 'public', addRandomSuffix: true });

    await updateUser(userId, { avatar_url: blob.url });

    return apiOk({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return apiError(`Upload failed: ${message}`, 500);
  }
}

export async function DELETE() {
  const userId = await getSession();
  if (!userId) {
    return apiError('Not logged in', 401);
  }

  const user = await getUserById(userId);
  if (user?.avatar_url && user.avatar_url.includes('blob.vercel-storage.com')) {
    try {
      await del(user.avatar_url);
    } catch {
      // Non-fatal
    }
  }

  await updateUser(userId, { avatar_url: '' });

  return apiOk({ url: null });
}
