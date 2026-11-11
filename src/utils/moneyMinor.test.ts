import { describe, expect, it } from 'vitest';
import { formatMoneyMinor } from './moneyMinor';

describe('server-provided minor-unit display', () => {
  it('formats NGN and USD without treating a missing amount as free', () => {
    expect(formatMoneyMinor(12345, 'NGN')).toContain('123.45');
    expect(formatMoneyMinor(12345, 'USD')).toContain('123.45');
    expect(formatMoneyMinor(undefined, 'NGN')).toBe('Not available');
    expect(formatMoneyMinor(100, 'EUR')).toBe('Not available');
  });
});
