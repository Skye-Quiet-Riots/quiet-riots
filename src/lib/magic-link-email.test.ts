import { describe, it, expect } from 'vitest';
import { extractLocale, loadEmailStrings, renderEmail, renderText } from './magic-link-email';

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
