import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractVideoId, getThumbnailUrl, getVideoMetadata } from './youtube';

describe('extractVideoId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from watch URL with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from live URL', () => {
    expect(extractVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from URL without www', () => {
    expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from http URL', () => {
    expect(extractVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URL', () => {
    expect(extractVideoId('https://example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(extractVideoId('not a url at all')).toBeNull();
  });

  it('returns null for YouTube URL without video ID', () => {
    expect(extractVideoId('https://www.youtube.com/')).toBeNull();
  });

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('https://youtu.be/a-b_c1D2E3F')).toBe('a-b_c1D2E3F');
  });
});

describe('getThumbnailUrl', () => {
  it('builds correct thumbnail URL', () => {
    expect(getThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});

describe('getVideoMetadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns metadata on successful oEmbed response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: 'Rick Astley - Never Gonna Give You Up',
          thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          author_name: 'Rick Astley',
        }),
    });
    const result = await getVideoMetadata('dQw4w9WgXcQ');
    expect(result).toEqual({
      title: 'Rick Astley - Never Gonna Give You Up',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      author_name: 'Rick Astley',
    });
  });

  it('falls back to getThumbnailUrl when thumbnail_url missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: 'Some Video',
          author_name: 'Author',
        }),
    });
    const result = await getVideoMetadata('abc12345678');
    expect(result?.thumbnail_url).toBe('https://img.youtube.com/vi/abc12345678/hqdefault.jpg');
  });

  it('returns null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await getVideoMetadata('nonexistent1');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await getVideoMetadata('dQw4w9WgXcQ');
    expect(result).toBeNull();
  });
});
