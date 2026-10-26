import { describe, expect, it } from 'vitest';
import { projectMapPricePresentation } from './projectFormatters';

describe('projectMapPricePresentation', () => {
  it('withholds incomplete FX aggregates and explains the unavailable comparison', () => {
    expect(projectMapPricePresentation(1_000_000, 2_000_000, 'NGN', 'fx_unconfigured')).toEqual({
      label: 'Price comparison unavailable',
      notice: 'Some foreign-currency prices could not be normalized with approved current rates.',
    });
  });

  it('formats a configured aggregate using its server currency', () => {
    expect(projectMapPricePresentation(1_000_000, 2_000_000, 'NGN', 'configured')).toMatchObject({
      label: expect.stringContaining('₦'),
      notice: null,
    });
  });
});
