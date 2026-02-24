import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/test/setup-db';
import { seedTestData } from '@/test/seed-test-data';
import { _resetRateLimitStore } from '@/lib/rate-limit';

// Mock @vercel/blob before importing route
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://abc.public.blob.vercel-storage.com/evidence/test.jpg',
    pathname: 'evidence/test.jpg',
  }),
}));

// Mock next/headers for session cookie auth tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { put } from '@vercel/blob';

const BOT_API_KEY = process.env.BOT_API_KEY || 'qr-bot-dev-key-2026';

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

function createUploadRequest(file: File, authHeader?: string): NextRequest {
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new NextRequest('http://localhost:3000/api/evidence/upload', {
    method: 'POST',
    headers,
    body: formData,
  });
}

describe('POST /api/evidence/upload', () => {
  describe('authentication', () => {
    it('accepts bot Bearer token', async () => {
      const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('rejects invalid Bearer token', async () => {
      mockLoggedOut();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file, 'Bearer wrong-key');
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('accepts session cookie auth', async () => {
      mockLoggedIn('user-sarah');
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file);
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('rejects with no auth at all', async () => {
      mockLoggedOut();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file);
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('validation', () => {
    it('rejects when no file provided', async () => {
      const formData = new FormData();
      const request = new NextRequest('http://localhost:3000/api/evidence/upload', {
        method: 'POST',
        headers: { authorization: `Bearer ${BOT_API_KEY}` },
        body: formData,
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('No file');
    });

    it('rejects unsupported file type', async () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Unsupported file type');
    });

    it('rejects oversized files', async () => {
      const bigData = new Uint8Array(5 * 1024 * 1024); // 5MB > 4MB limit
      const file = new File([bigData], 'big.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('too large');
    });
  });

  describe('upload', () => {
    it('returns blob URL and mediaType for image', async () => {
      const file = new File(['image-data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.url).toContain('blob.vercel-storage.com');
      expect(body.data.mediaType).toBe('photo');
      expect(body.data.size).toBeGreaterThan(0);
    });

    it('returns mediaType video for video files', async () => {
      const file = new File(['video-data'], 'clip.mp4', { type: 'video/mp4' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.mediaType).toBe('video');
    });

    it('calls Vercel Blob put with correct path pattern', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      await POST(request);
      expect(put).toHaveBeenCalledWith(
        expect.stringMatching(/^evidence\/[a-f0-9]+\.png$/),
        expect.any(File),
        { access: 'public' },
      );
    });

    it('accepts WebP images', async () => {
      const file = new File(['data'], 'photo.webp', { type: 'image/webp' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.mediaType).toBe('photo');
    });

    it('accepts MOV videos', async () => {
      const file = new File(['data'], 'clip.mov', { type: 'video/quicktime' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.mediaType).toBe('video');
    });

    it('returns 500 when Vercel Blob upload fails', async () => {
      vi.mocked(put).mockRejectedValueOnce(new Error('Blob storage unavailable'));
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Upload failed');
      expect(body.error).toContain('Blob storage unavailable');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      // Default limit is 30 requests per minute — send 31 to trigger
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      let response;
      for (let i = 0; i < 31; i++) {
        const request = createUploadRequest(file, `Bearer ${BOT_API_KEY}`);
        response = await POST(request);
        if (response.status === 429) break;
      }
      expect(response!.status).toBe(429);
      const body = await response!.json();
      expect(body.error).toContain('Too many requests');
    });
  });
});
