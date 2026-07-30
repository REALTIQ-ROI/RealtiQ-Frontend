import type { ProxyInspectionDetail, ProxyPricing, ServiceEscrow } from '../../types/proxyNetwork';

type PricingSource = (Partial<ProxyPricing> & Partial<Pick<ServiceEscrow, 'grossAmount' | 'platformFeePercentage' | 'platformFeeAmount' | 'providerAmount'>>) | null | undefined;

export interface NormalizedProxyPricing {
  agreedPrice?: number;
  buyerFeePercentage?: number;
  buyerFeeAmount: number;
  buyerTotalAmount?: number;
  inspectorCommissionPercentage?: number;
  inspectorCommissionAmount?: number;
  inspectorPayoutAmount?: number;
  totalPlatformRevenue?: number;
  legacyBuyerFee: boolean;
}

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const normalizeProxyPricing = (source?: PricingSource): NormalizedProxyPricing => {
  const agreedPrice = numberOrUndefined(source?.agreedPrice) ?? numberOrUndefined(source?.grossAmount);
  const buyerFeeAmount = numberOrUndefined(source?.buyerFeeAmount) ?? 0;
  const inspectorCommissionAmount = numberOrUndefined(source?.inspectorCommissionAmount) ?? numberOrUndefined(source?.platformFeeAmount);
  return {
    agreedPrice,
    buyerFeePercentage: numberOrUndefined(source?.buyerFeePercentage),
    buyerFeeAmount,
    buyerTotalAmount: numberOrUndefined(source?.buyerTotalAmount) ?? agreedPrice,
    inspectorCommissionPercentage: numberOrUndefined(source?.inspectorCommissionPercentage) ?? numberOrUndefined(source?.platformFeePercentage),
    inspectorCommissionAmount,
    inspectorPayoutAmount: numberOrUndefined(source?.inspectorPayoutAmount) ?? numberOrUndefined(source?.providerAmount),
    totalPlatformRevenue: numberOrUndefined(source?.totalPlatformRevenue) ?? (buyerFeeAmount + (inspectorCommissionAmount ?? 0)),
    legacyBuyerFee: source?.buyerFeeAmount == null,
  };
};

export const detailPricing = (detail: ProxyInspectionDetail): NormalizedProxyPricing => {
  const normalized = detail.pricing ? normalizeProxyPricing(detail.pricing) : normalizeProxyPricing(detail.serviceEscrow);
  const agreedPrice = detail.request.agreedPrice ?? detail.request.proposedPrice;
  return normalized.agreedPrice == null && agreedPrice != null
    ? { ...normalized, agreedPrice, buyerTotalAmount: normalized.buyerTotalAmount ?? agreedPrice }
    : normalized;
};

export const estimateProxyPricing = (agreedPrice: number, base: NormalizedProxyPricing): NormalizedProxyPricing | null => {
  if (!Number.isInteger(agreedPrice) || agreedPrice <= 0) return null;
  const buyerFeePercentage = base.buyerFeePercentage;
  const inspectorCommissionPercentage = base.inspectorCommissionPercentage;
  if (buyerFeePercentage == null && inspectorCommissionPercentage == null) return null;
  const buyerFeeAmount = buyerFeePercentage == null ? 0 : Math.round((agreedPrice * buyerFeePercentage) / 100);
  const inspectorCommissionAmount = inspectorCommissionPercentage == null ? undefined : Math.round((agreedPrice * inspectorCommissionPercentage) / 100);
  return {
    agreedPrice,
    buyerFeePercentage,
    buyerFeeAmount,
    buyerTotalAmount: agreedPrice + buyerFeeAmount,
    inspectorCommissionPercentage,
    inspectorCommissionAmount,
    inspectorPayoutAmount: inspectorCommissionAmount == null ? undefined : agreedPrice - inspectorCommissionAmount,
    totalPlatformRevenue: buyerFeeAmount + (inspectorCommissionAmount ?? 0),
    legacyBuyerFee: false,
  };
};
