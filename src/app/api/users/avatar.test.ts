import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';

// Mock @vercel/blob before importing route
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://abc.public.blob.vercel-storage.com/avatars/test.jpg',
    pathname: 'avatars/test.jpg',
  }),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock next/headers for session cookie auth
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/users/me/avatar/route';
import { put, del } from '@vercel/blob';
import { getUserById, updateUser } from '@/lib/queries/users';

beforeAll(async () => {
  await setupTestDb();
  await seedTestData();
});

beforeEach(() => {
  _resetRateLimitStore();
  vi.clearAllMocks();
});

afterAll(async () => {
  await teardownTestDb();
});

function mockLoggedIn(userId: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === 'qr_user_id' ? { name: 'qr_user_id', value: userId } : undefined,
    ),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function mockLoggedOut() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function createAvatarRequest(file: File): NextRequest {
  const formData = new FormData();
  formData.append('file', file);
  return new NextRequest('http://localhost:3000/api/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/users/me/avatar', () => {
  it('uploads avatar and updates user record', async () => {
    mockLoggedIn('user-sarah');
    const file = new File(['image-data'], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(createAvatarRequest(file));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.url).toContain('blob.vercel-storage.com');

    // Verify DB was updated
    const user = await getUserById('user-sarah');
    expect(user?.avatar_url).toBe('https://abc.public.blob.vercel-storage.com/avatars/test.jpg');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(createAvatarRequest(file));
    expect(response.status).toBe(401);
  });

  it('rejects unsupported file types', async () => {
    mockLoggedIn('user-sarah');
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const response = await POST(createAvatarRequest(file));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Unsupported file type');
  });

  it('rejects GIF files (only JPEG/PNG/WebP allowed)', async () => {
    mockLoggedIn('user-sarah');
    const file = new File(['data'], 'anim.gif', { type: 'image/gif' });
    const response = await POST(createAvatarRequest(file));
    expect(response.status).toBe(400);
  });

  it('rejects files over 2MB', async () => {
    mockLoggedIn('user-sarah');
    const bigData = new Uint8Array(3 * 1024 * 1024); // 3MB > 2MB limit
    const file = new File([bigData], 'big.jpg', { type: 'image/jpeg' });
    const response = await POST(createAvatarRequest(file));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('too large');
  });

  it('rejects when no file provided', async () => {
    mockLoggedIn('user-sarah');
    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('No file');
  });

  it('calls Vercel Blob put with correct path pattern', async () => {
    mockLoggedIn('user-sarah');
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    await POST(createAvatarRequest(file));
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/user-sarah\.png$/),
      expect.any(File),
      { access: 'public', addRandomSuffix: true },
    );
  });

  it('deletes old avatar blob when uploading new one', async () => {
    mockLoggedIn('user-sarah');
    // Set an existing avatar URL
    await updateUser('user-sarah', {
      avatar_url: 'https://old.public.blob.vercel-storage.com/avatars/old.jpg',
    });

    const file = new File(['new-data'], 'new.jpg', { type: 'image/jpeg' });
    await POST(createAvatarRequest(file));

    expect(del).toHaveBeenCalledWith('https://old.public.blob.vercel-storage.com/avatars/old.jpg');
  });

  it('returns 500 when blob upload fails', async () => {
    mockLoggedIn('user-sarah');
    vi.mocked(put).mockRejectedValueOnce(new Error('Blob storage unavailable'));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(createAvatarRequest(file));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Upload failed');
  });
});

describe('DELETE /api/users/me/avatar', () => {
  it('removes avatar and clears DB field', async () => {
    mockLoggedIn('user-sarah');
    // Set an avatar URL first
    await updateUser('user-sarah', {
      avatar_url: 'https://abc.public.blob.vercel-storage.com/avatars/sarah.jpg',
    });

    const response = await DELETE();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.url).toBeNull();

    // Verify blob was deleted
    expect(del).toHaveBeenCalledWith(
      'https://abc.public.blob.vercel-storage.com/avatars/sarah.jpg',
    );

    // Verify DB was cleared
    const user = await getUserById('user-sarah');
    expect(user?.avatar_url).toBe('');
  });

  it('returns 401 when not logged in', async () => {
    mockLoggedOut();
    const response = await DELETE();
    expect(response.status).toBe(401);
  });
});
