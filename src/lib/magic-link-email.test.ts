import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractLocale,
  loadEmailStrings,
  renderEmail,
  renderText,
  escapeHtml,
  validateUrl,
  sendVerificationRequest,
} from './magic-link-email';

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('escapes script tags', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });
});

describe('validateUrl', () => {
  it('allows https URLs', () => {
    expect(validateUrl('https://example.com/verify?token=abc')).toBe(
      'https://example.com/verify?token=abc',
    );
  });

  it('allows http URLs (local dev)', () => {
    expect(validateUrl('http://localhost:3000/verify')).toBe('http://localhost:3000/verify');
  });

  it('rejects javascript: URLs', () => {
    expect(() => validateUrl('javascript:alert(1)')).toThrow('Invalid verification URL scheme');
  });

  it('rejects data: URLs', () => {
    expect(() => validateUrl('data:text/html,<script>alert(1)</script>')).toThrow(
      'Invalid verification URL scheme',
    );
  });

  it('rejects invalid URLs', () => {
    expect(() => validateUrl('not-a-url')).toThrow('Invalid verification URL scheme');
  });

  it('rejects empty string', () => {
    expect(() => validateUrl('')).toThrow('Invalid verification URL scheme');
  });
});

describe('extractLocale', () => {
  it('extracts locale from callbackUrl parameter', () => {
    const url =
      'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Ffr&token=abc&email=test%40test.com';
    expect(extractLocale(url)).toBe('fr');
  });

  it('extracts locale with country code (pt-BR)', () => {
    const url =
      'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Fpt-BR%2Fonboard&token=abc&email=test%40test.com';
    expect(extractLocale(url)).toBe('pt-BR');
  });

  it('extracts locale from onboard callbackUrl', () => {
    const url =
      'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Fde%2Fonboard&token=abc&email=test%40test.com';
    expect(extractLocale(url)).toBe('de');
  });

  it('falls back to en when no callbackUrl', () => {
    const url =
      'https://www.quietriots.com/api/auth/callback/resend?token=abc&email=test%40test.com';
    expect(extractLocale(url)).toBe('en');
  });

  it('falls back to en for invalid URL', () => {
    expect(extractLocale('not-a-url')).toBe('en');
  });

  it('falls back to en when callbackUrl has no locale prefix', () => {
    const url =
      'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2F&token=abc&email=test%40test.com';
    expect(extractLocale(url)).toBe('en');
  });
});

describe('loadEmailStrings', () => {
  it('loads English strings', async () => {
    const strings = await loadEmailStrings('en');
    expect(strings.emailSubject).toBe('Sign in to Quiet Riots');
    expect(strings.emailButton).toBe('Sign in');
    expect(strings.emailHeading).toContain('Quiet Riots');
  });

  it('falls back to English for unknown locale', async () => {
    const strings = await loadEmailStrings('xx');
    expect(strings.emailSubject).toBe('Sign in to Quiet Riots');
  });

  it('loads non-English locale strings (French)', async () => {
    const strings = await loadEmailStrings('fr');
    // French strings should differ from English defaults
    expect(strings.emailSubject).toBeTruthy();
    expect(strings.emailButton).toBeTruthy();
    // Should not be the English defaults (French translations exist)
    expect(strings.emailButton).not.toBe('Sign in');
  });

  it('loads RTL locale strings (Arabic)', async () => {
    const strings = await loadEmailStrings('ar');
    expect(strings.emailSubject).toBeTruthy();
    expect(strings.emailButton).toBeTruthy();
    expect(strings.emailButton).not.toBe('Sign in');
  });

  it('returns all five required keys', async () => {
    const strings = await loadEmailStrings('en');
    expect(strings).toHaveProperty('emailSubject');
    expect(strings).toHaveProperty('emailHeading');
    expect(strings).toHaveProperty('emailBody');
    expect(strings).toHaveProperty('emailButton');
    expect(strings).toHaveProperty('emailIgnore');
  });
});

describe('renderEmail', () => {
  const strings = {
    emailSubject: 'Sign in',
    emailHeading: 'Sign in to Quiet Riots',
    emailBody: 'Click below to sign in.',
    emailButton: 'Sign in',
    emailIgnore: 'Ignore if not you.',
  };

  it('renders HTML with the sign-in URL', () => {
    const html = renderEmail('https://example.com/verify?token=abc', strings);
    expect(html).toContain('href="https://example.com/verify?token=abc"');
    expect(html).toContain('Sign in to Quiet Riots');
    expect(html).toContain('Click below to sign in.');
    expect(html).toContain('>Sign in<');
    expect(html).toContain('Ignore if not you.');
  });

  it('includes the Quiet Riots logo', () => {
    const html = renderEmail('https://example.com', strings);
    expect(html).toContain('logo-192.png');
  });

  // XSS regression tests
  it('escapes HTML in translation strings to prevent XSS', () => {
    const xssStrings = {
      emailSubject: 'Test',
      emailHeading: '<script>alert("xss")</script>',
      emailBody: '<img onerror="alert(1)" src=x>',
      emailButton: '"><script>alert(1)</script>',
      emailIgnore: "' onclick='alert(1)'",
    };
    const html = renderEmail('https://example.com/verify', xssStrings);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror="alert');
    expect(html).not.toContain("onclick='alert");
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img onerror=&quot;');
  });

  it('rejects javascript: URL scheme', () => {
    expect(() => renderEmail('javascript:alert(1)', strings)).toThrow(
      'Invalid verification URL scheme',
    );
  });

  it('rejects data: URL scheme', () => {
    expect(() => renderEmail('data:text/html,<script>alert(1)</script>', strings)).toThrow(
      'Invalid verification URL scheme',
    );
  });

  // RTL support
  it('sets dir="ltr" for English', () => {
    const html = renderEmail('https://example.com', strings, 'en');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('lang="en"');
  });

  it('sets dir="rtl" for Arabic', () => {
    const html = renderEmail('https://example.com', strings, 'ar');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('text-align:right');
  });

  it('sets dir="rtl" for Hebrew', () => {
    const html = renderEmail('https://example.com', strings, 'he');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="he"');
  });

  it('sets dir="rtl" for Farsi', () => {
    const html = renderEmail('https://example.com', strings, 'fa');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
  });

  it('defaults to ltr when no locale provided', () => {
    const html = renderEmail('https://example.com', strings);
    expect(html).toContain('dir="ltr"');
  });

  it('escapes locale in lang attribute', () => {
    const html = renderEmail('https://example.com', strings, '"><script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('renderText', () => {
  it('renders plain text with the URL', () => {
    const strings = {
      emailSubject: 'Sign in',
      emailHeading: 'Sign in to Quiet Riots',
      emailBody: 'Click below.',
      emailButton: 'Sign in',
      emailIgnore: 'Ignore if not you.',
    };
    const text = renderText('https://example.com/verify', strings);
    expect(text).toContain('https://example.com/verify');
    expect(text).toContain('Sign in to Quiet Riots');
    expect(text).toContain('Ignore if not you.');
  });
});

describe('sendVerificationRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends email via Resend API with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendVerificationRequest({
      identifier: 'user@example.com',
      url: 'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Fen&token=abc&email=user%40example.com',
      provider: {
        apiKey: 'test-api-key',
        from: 'Quiet Riots <noreply@quietriots.com>',
        id: 'resend',
        type: 'email',
        name: 'Resend',
      },
      expires: new Date(),
      token: 'abc',
      request: new Request('https://example.com'),
      theme: {},
    } as Parameters<typeof sendVerificationRequest>[0]);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [fetchUrl, fetchOptions] = mockFetch.mock.calls[0];
    expect(fetchUrl).toBe('https://api.resend.com/emails');
    expect(fetchOptions.method).toBe('POST');

    const body = JSON.parse(fetchOptions.body);
    expect(body.to).toBe('user@example.com');
    expect(body.from).toBe('Quiet Riots <noreply@quietriots.com>');
    expect(body.subject).toBeTruthy();
    expect(body.html).toContain('<!DOCTYPE html>');
    expect(body.text).toBeTruthy();

    vi.unstubAllGlobals();
  });

  it('throws on Resend API error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid API key' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      sendVerificationRequest({
        identifier: 'user@example.com',
        url: 'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Fen&token=abc&email=user%40example.com',
        provider: {
          apiKey: 'bad-key',
          from: 'noreply@test.com',
          id: 'resend',
          type: 'email',
          name: 'Resend',
        },
        expires: new Date(),
        token: 'abc',
        request: new Request('https://example.com'),
        theme: {},
      } as Parameters<typeof sendVerificationRequest>[0]),
    ).rejects.toThrow('Resend error');

    vi.unstubAllGlobals();
  });

  it('extracts locale from URL and passes it to renderEmail', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendVerificationRequest({
      identifier: 'user@example.com',
      url: 'https://www.quietriots.com/api/auth/callback/resend?callbackUrl=%2Far&token=abc&email=user%40example.com',
      provider: {
        apiKey: 'test-api-key',
        from: 'noreply@test.com',
        id: 'resend',
        type: 'email',
        name: 'Resend',
      },
      expires: new Date(),
      token: 'abc',
      request: new Request('https://example.com'),
      theme: {},
    } as Parameters<typeof sendVerificationRequest>[0]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // Arabic locale should produce RTL email
    expect(body.html).toContain('dir="rtl"');
    expect(body.html).toContain('lang="ar"');

    vi.unstubAllGlobals();
  });
});
