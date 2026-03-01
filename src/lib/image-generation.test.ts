import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: [{ b64_json: Buffer.from('fake-png-data').toString('base64') }],
  }),
);

const mockSharp = vi.hoisted(() => {
  const chain = {
    webp: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('webp-data')),
  };
  return {
    chain,
    fn: vi.fn().mockReturnValue(chain),
  };
});

const mockPut = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.webp' }),
);

const mockExecute = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));

// Mock OpenAI — use a class that returns a mock instance
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      images = { generate: mockGenerate };
    },
  };
});

// Mock sharp
vi.mock('sharp', () => ({
  default: mockSharp.fn,
}));

// Mock Vercel Blob
vi.mock('@vercel/blob', () => ({
  put: mockPut,
}));

// Mock db
vi.mock('./db', () => ({
  getDb: vi.fn().mockReturnValue({ execute: mockExecute }),
  withTimeout: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { generateHeroImage, updateEntityHeroImage } from './image-generation';

describe('image-generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerate.mockResolvedValue({
      data: [{ b64_json: Buffer.from('fake-png-data').toString('base64') }],
    });
    mockSharp.chain.webp.mockReturnThis();
    mockSharp.chain.resize.mockReturnThis();
    mockSharp.chain.toBuffer.mockResolvedValue(Buffer.from('webp-data'));
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.webp' });
    mockExecute.mockResolvedValue({ rows: [] });
  });

  describe('generateHeroImage', () => {
    it('returns error when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.BLOB_READ_WRITE_TOKEN;
      const result = await generateHeroImage('issue', 'test-id', 'Test Issue');
      expect(result.success).toBe(false);
      expect(result.error).toBe('OPENAI_API_KEY not configured');
    });

    it('returns error when BLOB_READ_WRITE_TOKEN is not set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      delete process.env.BLOB_READ_WRITE_TOKEN;
      const result = await generateHeroImage('issue', 'test-id', 'Test Issue');
      expect(result.success).toBe(false);
      expect(result.error).toBe('BLOB_READ_WRITE_TOKEN not configured');
    });

    it('generates image, converts to WebP, and uploads to Vercel Blob', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';

      const result = await generateHeroImage('issue', 'issue-123', 'Train Cancellations');

      expect(result.success).toBe(true);
      expect(result.heroUrl).toBe('https://blob.vercel-storage.com/test.webp');
      expect(result.thumbUrl).toBe('https://blob.vercel-storage.com/test.webp');

      // Verify sharp was called for both hero and thumbnail
      expect(mockSharp.fn).toHaveBeenCalledTimes(2);
      expect(mockSharp.chain.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSharp.chain.resize).toHaveBeenCalledWith(400, 267, {
        fit: 'cover',
        position: 'centre',
      });

      // Verify Vercel Blob uploads
      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut).toHaveBeenCalledWith(
        'heroes/issue/issue-123.webp',
        expect.any(Buffer),
        expect.objectContaining({ access: 'public', contentType: 'image/webp' }),
      );
      expect(mockPut).toHaveBeenCalledWith(
        'heroes/issue/issue-123-thumb.webp',
        expect.any(Buffer),
        expect.objectContaining({ access: 'public', contentType: 'image/webp' }),
      );

      // Verify DB update
      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'UPDATE issues SET hero_image_url = ?, hero_thumb_url = ? WHERE id = ?',
        args: [
          'https://blob.vercel-storage.com/test.webp',
          'https://blob.vercel-storage.com/test.webp',
          'issue-123',
        ],
      });
    });

    it('works for organisations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';

      const result = await generateHeroImage('organisation', 'org-456', 'Acme Corp');

      expect(result.success).toBe(true);
      expect(mockPut).toHaveBeenCalledWith(
        'heroes/organisation/org-456.webp',
        expect.any(Buffer),
        expect.any(Object),
      );
      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'UPDATE organisations SET hero_image_url = ?, hero_thumb_url = ? WHERE id = ?',
        args: expect.arrayContaining(['org-456']),
      });
    });

    it('returns error on OpenAI failure', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';
      mockGenerate.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await generateHeroImage('issue', 'test-id', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('returns error when no image data returned', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';
      mockGenerate.mockResolvedValue({ data: [{}] });

      const result = await generateHeroImage('issue', 'test-id', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image data returned from DALL-E');
    });
  });

  describe('updateEntityHeroImage', () => {
    it('updates issue hero image columns', async () => {
      await updateEntityHeroImage('issue', 'id-1', 'https://hero.url', 'https://thumb.url');
      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'UPDATE issues SET hero_image_url = ?, hero_thumb_url = ? WHERE id = ?',
        args: ['https://hero.url', 'https://thumb.url', 'id-1'],
      });
    });

    it('updates organisation hero image columns', async () => {
      await updateEntityHeroImage(
        'organisation',
        'org-1',
        'https://hero.url',
        'https://thumb.url',
      );
      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'UPDATE organisations SET hero_image_url = ?, hero_thumb_url = ? WHERE id = ?',
        args: ['https://hero.url', 'https://thumb.url', 'org-1'],
      });
    });
  });
});
