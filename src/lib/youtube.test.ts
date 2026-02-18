import { describe, it, expect } from 'vitest';
import { extractVideoId, getThumbnailUrl } from './youtube';

describe('extractVideoId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from watch URL with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')).toBe(
      'dQw4w9WgXcQ',
    );
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
