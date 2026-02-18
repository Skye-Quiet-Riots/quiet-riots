import { describe, it, expect } from 'vitest';
import { normalizePhone, trimAndLimit, sanitizeText } from './sanitize';

describe('normalizePhone', () => {
  it('accepts valid E.164 numbers', () => {
    expect(normalizePhone('+447911123456')).toBe('+447911123456');
    expect(normalizePhone('+5511999999999')).toBe('+5511999999999');
    expect(normalizePhone('+12025551234')).toBe('+12025551234');
  });

  it('trims whitespace', () => {
    expect(normalizePhone('  +447911123456  ')).toBe('+447911123456');
  });

  it('rejects numbers without + prefix', () => {
    expect(() => normalizePhone('447911123456')).toThrow('Invalid E.164');
  });

  it('rejects numbers starting with +0', () => {
    expect(() => normalizePhone('+0447911123456')).toThrow('Invalid E.164');
  });

  it('rejects too-short numbers', () => {
    expect(() => normalizePhone('+12345')).toThrow('Invalid E.164');
  });

  it('rejects too-long numbers', () => {
    expect(() => normalizePhone('+1234567890123456')).toThrow('Invalid E.164');
  });

  it('rejects numbers with letters', () => {
    expect(() => normalizePhone('+44abc1234567')).toThrow('Invalid E.164');
  });

  it('rejects empty string', () => {
    expect(() => normalizePhone('')).toThrow('Invalid E.164');
  });
});

describe('trimAndLimit', () => {
  it('trims whitespace', () => {
    expect(trimAndLimit('  hello  ', 100)).toBe('hello');
  });

  it('truncates to max length', () => {
    expect(trimAndLimit('hello world', 5)).toBe('hello');
  });

  it('returns full string when under limit', () => {
    expect(trimAndLimit('short', 100)).toBe('short');
  });

  it('handles empty string', () => {
    expect(trimAndLimit('', 100)).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(trimAndLimit('   ', 100)).toBe('');
  });
});

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('strips control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('helloworld');
    expect(sanitizeText('hello\x01\x02\x03world')).toBe('helloworld');
    expect(sanitizeText('test\x7Fvalue')).toBe('testvalue');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeText('hello\nworld')).toBe('hello\nworld');
    expect(sanitizeText('hello\tworld')).toBe('hello\tworld');
    expect(sanitizeText('line1\r\nline2')).toBe('line1\r\nline2');
  });

  it('preserves emojis and unicode', () => {
    expect(sanitizeText('Hello 🌍 World')).toBe('Hello 🌍 World');
  });

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('');
  });
});
