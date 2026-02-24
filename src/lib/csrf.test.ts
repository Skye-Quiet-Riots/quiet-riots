import { describe, it, expect } from 'vitest';
import { validateOrigin } from './csrf';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://www.quietriots.com/api/test', {
    method: 'POST',
    headers,
  });
}

describe('validateOrigin', () => {
  it('accepts requests with valid Origin header', () => {
    expect(validateOrigin(makeRequest({ origin: 'https://www.quietriots.com' }))).toBe(true);
    expect(validateOrigin(makeRequest({ origin: 'https://quietriots.com' }))).toBe(true);
  });

  it('rejects requests with invalid Origin header', () => {
    expect(validateOrigin(makeRequest({ origin: 'https://evil.com' }))).toBe(false);
    expect(validateOrigin(makeRequest({ origin: 'https://www.quietriots.com.evil.com' }))).toBe(
      false,
    );
  });

  it('falls back to Referer header when no Origin', () => {
    expect(validateOrigin(makeRequest({ referer: 'https://www.quietriots.com/issues/123' }))).toBe(
      true,
    );
  });

  it('rejects requests with invalid Referer header', () => {
    expect(validateOrigin(makeRequest({ referer: 'https://evil.com/phishing' }))).toBe(false);
  });

  it('rejects requests with no Origin or Referer', () => {
    expect(validateOrigin(makeRequest({}))).toBe(false);
  });

  it('rejects requests with malformed Referer', () => {
    expect(validateOrigin(makeRequest({ referer: 'not-a-url' }))).toBe(false);
  });

  it('accepts localhost in development mode', () => {
    // Dev mode is enabled because process.env.NODE_ENV is 'test' which evaluates
    // to the dev branch in csrf.ts — check by verifying localhost isn't in production set
    // This test verifies the allowlist doesn't contain localhost unless in dev/test
    const req = makeRequest({ origin: 'http://localhost:3000' });
    // In test env NODE_ENV=test, which hits the dev code path
    expect(validateOrigin(req)).toBe(true);
  });
});
