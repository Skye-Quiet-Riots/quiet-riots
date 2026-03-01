import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock session
const mockSession = vi.fn().mockResolvedValue('user-admin');
vi.mock('@/lib/session', () => ({
  getSession: () => mockSession(),
}));

// Mock roles
const mockHasRole = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/queries/roles', () => ({
  hasRole: (...args: unknown[]) => mockHasRole(...args),
}));

// Mock rate limit
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

// Mock image generation
const mockGenerateHeroImage = vi.fn().mockResolvedValue({
  success: true,
  heroUrl: 'https://blob.vercel-storage.com/hero.webp',
  thumbUrl: 'https://blob.vercel-storage.com/thumb.webp',
});
vi.mock('@/lib/image-generation', () => ({
  generateHeroImage: (...args: unknown[]) => mockGenerateHeroImage(...args),
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/hero-image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/hero-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockResolvedValue('user-admin');
    mockHasRole.mockResolvedValue(true);
    mockGenerateHeroImage.mockResolvedValue({
      success: true,
      heroUrl: 'https://blob.vercel-storage.com/hero.webp',
      thumbUrl: 'https://blob.vercel-storage.com/thumb.webp',
    });
  });

  it('returns 401 when not logged in', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ entityType: 'issue', entityId: 'x', entityName: 'X' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockHasRole.mockResolvedValue(false);
    const res = await POST(makeRequest({ entityType: 'issue', entityId: 'x', entityName: 'X' }));
    expect(res.status).toBe(403);
  });

  it('validates request body', async () => {
    const res = await POST(makeRequest({ entityType: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('generates hero image for issue', async () => {
    const res = await POST(
      makeRequest({
        entityType: 'issue',
        entityId: 'issue-123',
        entityName: 'Train Cancellations',
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.heroUrl).toBe('https://blob.vercel-storage.com/hero.webp');
    expect(data.data.thumbUrl).toBe('https://blob.vercel-storage.com/thumb.webp');
    expect(mockGenerateHeroImage).toHaveBeenCalledWith(
      'issue',
      'issue-123',
      'Train Cancellations',
    );
  });

  it('generates hero image for organisation', async () => {
    const res = await POST(
      makeRequest({ entityType: 'organisation', entityId: 'org-1', entityName: 'Acme Corp' }),
    );
    expect(res.status).toBe(200);
    expect(mockGenerateHeroImage).toHaveBeenCalledWith('organisation', 'org-1', 'Acme Corp');
  });

  it('returns 500 on generation failure', async () => {
    mockGenerateHeroImage.mockResolvedValue({ success: false, error: 'API error' });
    const res = await POST(
      makeRequest({ entityType: 'issue', entityId: 'x', entityName: 'Test' }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('API error');
  });
});
