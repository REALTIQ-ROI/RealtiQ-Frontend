import type { CanonicalFieldDictionary } from '../services/canonicalFieldService';

export type DisplayCurrency = 'NGN' | 'USD' | null;

export interface OfficialFxRate {
  amount: number;
  baseCurrency: 'USD';
  quoteCurrency: 'NGN';
  source: string;
  provider: 'cbn_nfem';
  series: string;
  rateDate: string;
  effectiveAt: string;
  recordedAt: string;
}

export type FxRateValue = Pick<OfficialFxRate, 'amount'>;

export interface PricePresentation {
  displayAmount: number;
  displayCurrency: string;
  displayText: string;
  originalText: string;
  converted: boolean;
  conversionUnavailable: boolean;
  unsupportedCurrency: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const officialFxRateFromDictionary = (dictionary: CanonicalFieldDictionary | null | undefined): OfficialFxRate | null => {
  const fx = asRecord(dictionary?.configuration.fx);
  const rate = asRecord(fx?.currentRate);
  if (fx?.state !== 'configured' || fx.conversionEnabled !== true || !rate) return null;
  if (typeof rate.amount !== 'number' || !Number.isFinite(rate.amount) || rate.amount <= 0 ||
      rate.baseCurrency !== 'USD' || rate.quoteCurrency !== 'NGN' || rate.provider !== 'cbn_nfem') return null;
  return {
    amount: rate.amount,
    baseCurrency: 'USD',
    quoteCurrency: 'NGN',
    source: typeof rate.source === 'string' ? rate.source : 'Central Bank of Nigeria',
    provider: 'cbn_nfem',
    series: typeof rate.series === 'string' ? rate.series : 'NFEM_DAILY_VWAP',
    rateDate: typeof rate.rateDate === 'string' ? rate.rateDate : '',
    effectiveAt: typeof rate.effectiveAt === 'string' ? rate.effectiveAt : '',
    recordedAt: typeof rate.recordedAt === 'string' ? rate.recordedAt : '',
  };
};

export const formatCurrencyAmount = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount)) return 'Price unavailable';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount);
  } catch {
    return 'Price unavailable';
  }
};

export const getPricePresentation = (
  amount: number,
  currency: string,
  displayCurrency: DisplayCurrency,
  rate: FxRateValue | null,
): PricePresentation => {
  const originalText = formatCurrencyAmount(amount, currency);
  const supportedSource = currency === 'NGN' || currency === 'USD';
  if (!displayCurrency || !supportedSource || currency === displayCurrency) {
    return {
      displayAmount: amount,
      displayCurrency: currency,
      displayText: originalText,
      originalText,
      converted: false,
      conversionUnavailable: Boolean(displayCurrency && supportedSource && currency !== displayCurrency && !rate),
      unsupportedCurrency: Boolean(displayCurrency && !supportedSource),
    };
  }
  if (!rate) {
    return { displayAmount: amount, displayCurrency: currency, displayText: originalText, originalText, converted: false, conversionUnavailable: true, unsupportedCurrency: false };
  }
  const converted = currency === 'USD' ? amount * rate.amount : amount / rate.amount;
  if (!Number.isFinite(converted)) {
    return { displayAmount: amount, displayCurrency: currency, displayText: originalText, originalText, converted: false, conversionUnavailable: true, unsupportedCurrency: false };
  }
  return {
    displayAmount: converted,
    displayCurrency,
    displayText: formatCurrencyAmount(converted, displayCurrency),
    originalText,
    converted: true,
    conversionUnavailable: false,
    unsupportedCurrency: false,
  };
};

export const formatCompactCurrencyAmount = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount) || !['NGN', 'USD'].includes(currency)) return 'View';
  let symbol: string;
  try {
    symbol = new Intl.NumberFormat('en-NG', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })
      .formatToParts(0).find((part) => part.type === 'currency')?.value ?? '';
  } catch { return 'View'; }
  if (!symbol) return 'View';
  if (amount >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}K`;
  return `${symbol}${Math.round(amount)}`;
};

export const formatOfficialRate = (rate: OfficialFxRate): string =>
  `1 USD = ₦${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate.amount)}`;

export const formatFxRateDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const formatFxUpdatedAt = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

export const formatPriceRangeForDisplay = (
  minimum: number | null | undefined,
  maximum: number | null | undefined,
  currency: string,
  displayCurrency: DisplayCurrency,
  rate: FxRateValue | null,
): string => {
  const amountText = (amount: number | null | undefined) => typeof amount === 'number' && Number.isFinite(amount) ? formatCurrencyAmount(amount, currency) : null;
  const originalMin = amountText(minimum);
  const originalMax = amountText(maximum);
  if (!originalMin && !originalMax) return 'Price unavailable';
  const original = !originalMin ? `Up to ${originalMax}` : !originalMax ? `From ${originalMin}` : minimum === maximum ? `From ${originalMin}` : `${originalMin} – ${originalMax}`;
  const supportsConversion = currency === 'NGN' || currency === 'USD';
  if (!displayCurrency || !supportsConversion || currency === displayCurrency || !rate) return original;
  const convertedMin = minimum === null || minimum === undefined ? minimum : currency === 'USD' ? minimum * rate.amount : minimum / rate.amount;
  const convertedMax = maximum === null || maximum === undefined ? maximum : currency === 'USD' ? maximum * rate.amount : maximum / rate.amount;
  const converted = formatPriceRangeForDisplay(convertedMin, convertedMax, displayCurrency, null, null);
  return `${converted} · originally ${original}`;
};
