import { describe, expect, it } from 'vitest';
import { estimateProxyPricing, normalizeProxyPricing } from './pricing';

describe('Proxy Inspection pricing normalization', () => {
  it('normalizes dynamic buyer fee and inspector commission values', () => {
    const pricing = normalizeProxyPricing({
      agreedPrice: 40_000,
      buyerFeePercentage: 10,
      buyerFeeAmount: 4_000,
      buyerTotalAmount: 44_000,
      inspectorCommissionPercentage: 10,
      inspectorCommissionAmount: 4_000,
      inspectorPayoutAmount: 36_000,
      totalPlatformRevenue: 8_000,
    });

    expect(pricing).toMatchObject({
      agreedPrice: 40_000,
      buyerFeeAmount: 4_000,
      buyerTotalAmount: 44_000,
      inspectorCommissionAmount: 4_000,
      inspectorPayoutAmount: 36_000,
      totalPlatformRevenue: 8_000,
      legacyBuyerFee: false,
    });
  });

  it('uses legacy escrow fallbacks without inventing a buyer fee', () => {
    const pricing = normalizeProxyPricing({
      grossAmount: 25_000,
      platformFeePercentage: 10,
      platformFeeAmount: 2_500,
      providerAmount: 22_500,
    });

    expect(pricing).toMatchObject({
      agreedPrice: 25_000,
      buyerFeeAmount: 0,
      buyerTotalAmount: 25_000,
      inspectorCommissionPercentage: 10,
      inspectorCommissionAmount: 2_500,
      inspectorPayoutAmount: 22_500,
      totalPlatformRevenue: 2_500,
      legacyBuyerFee: true,
    });
  });

  it('estimates proposal pricing using returned task percentages only', () => {
    const estimate = estimateProxyPricing(40_000, normalizeProxyPricing({
      buyerFeePercentage: 10,
      inspectorCommissionPercentage: 10,
    }));

    expect(estimate).toMatchObject({
      agreedPrice: 40_000,
      buyerFeeAmount: 4_000,
      buyerTotalAmount: 44_000,
      inspectorCommissionAmount: 4_000,
      inspectorPayoutAmount: 36_000,
      totalPlatformRevenue: 8_000,
    });
  });
});
