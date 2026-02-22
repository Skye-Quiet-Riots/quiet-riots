import { describe, it, expect } from 'vitest';
import { formatPence } from './format';

describe('formatPence', () => {
  it('formats pence under £1 as Xp', () => {
    expect(formatPence(50)).toBe('50p');
    expect(formatPence(1)).toBe('1p');
    expect(formatPence(99)).toBe('99p');
  });

  it('formats exact pounds without decimals', () => {
    expect(formatPence(100)).toBe('£1');
    expect(formatPence(500)).toBe('£5');
    expect(formatPence(10000)).toBe('£100');
  });

  it('formats pounds with pence using 2 decimal places', () => {
    expect(formatPence(150)).toBe('£1.50');
    expect(formatPence(1099)).toBe('£10.99');
    expect(formatPence(250)).toBe('£2.50');
  });

  it('formats zero', () => {
    expect(formatPence(0)).toBe('0p');
  });
});
