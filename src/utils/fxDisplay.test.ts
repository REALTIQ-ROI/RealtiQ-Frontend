import { describe, expect, it } from 'vitest';
import {
  formatFxRateDate,
  formatOfficialRate,
  getPricePresentation,
  officialFxRateFromDictionary,
  type DisplayCurrency,
  type OfficialFxRate,
} from './fxDisplay';
import type { CanonicalFieldDictionary } from '../services/canonicalFieldService';

const rate: OfficialFxRate = {
  amount: 1500.25,
  baseCurrency: 'USD',
  quoteCurrency: 'NGN',
  source: 'Central Bank of Nigeria',
  provider: 'cbn_nfem',
  series: 'NFEM_DAILY_VWAP',
  rateDate: '2026-11-26',
  effectiveAt: '2026-11-26T08:00:00.000Z',
  recordedAt: '2026-11-26T09:00:00.000Z',
};

const dictionaryWithFx = (fx: Record<string, unknown>) => ({
  version: 3,
  fields: [],
  configuration: { fx },
} as unknown as CanonicalFieldDictionary);

describe('official NFEM display conversion', () => {
  it('uses only the active CBN NFEM rate from configured dictionary data', () => {
    expect(officialFxRateFromDictionary(dictionaryWithFx({ state: 'configured', conversionEnabled: true, currentRate: rate }))).toEqual(rate);
    expect(officialFxRateFromDictionary(dictionaryWithFx({ state: 'unavailable', conversionEnabled: true, currentRate: rate }))).toBeNull();
    expect(officialFxRateFromDictionary(dictionaryWithFx({ state: 'configured', conversionEnabled: false, currentRate: rate }))).toBeNull();
  });

  it('converts USD to NGN and preserves the original amount and currency', () => {
    const result = getPricePresentation(100, 'USD', 'NGN', rate);
    expect(result.displayAmount).toBe(150025);
    expect(result.displayCurrency).toBe('NGN');
    expect(result.converted).toBe(true);
    expect(result.originalText).toContain('$100');
  });

  it('converts NGN to USD', () => {
    const result = getPricePresentation(150025, 'NGN', 'USD', rate);
    expect(result.displayAmount).toBe(100);
    expect(result.displayCurrency).toBe('USD');
    expect(result.displayText).toContain('$100.00');
  });

  it('keeps the original price and reports unavailability without a live rate', () => {
    const displayCurrency: DisplayCurrency = 'NGN';
    const result = getPricePresentation(100, 'USD', displayCurrency, null);
    expect(result.displayAmount).toBe(100);
    expect(result.displayCurrency).toBe('USD');
    expect(result.converted).toBe(false);
    expect(result.conversionUnavailable).toBe(true);
  });

  it('does not convert unsupported currencies', () => {
    const result = getPricePresentation(100, 'EUR', 'NGN', rate);
    expect(result.displayCurrency).toBe('EUR');
    expect(result.converted).toBe(false);
    expect(result.unsupportedCurrency).toBe(true);
  });

  it('formats the rate direction and rate date clearly', () => {
    expect(formatOfficialRate(rate)).toBe('1 USD = ₦1,500.25');
    expect(formatFxRateDate(rate.rateDate)).toBe('26 Nov 2026');
  });
});
