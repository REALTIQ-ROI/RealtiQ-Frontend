export interface ROICalculationInput {
  purchasePrice: number;
  annualRent: number;
  operatingExpenses: number;
  appreciationRate: number;
  holdingPeriodYears: number;
  downPaymentPercent: number;
  closingCosts: number;
  currency: string;
}

export interface ROICalculationResult {
  totalInvestment: number;
  netAnnualIncome: number;
  totalRentalIncome: number;
  projectedSalePrice: number;
  projectedGain: number;
  totalProfit: number;
  cashOnCashReturn: number;
  annualizedROI: number;
  grossYield: number;
  currency: string;
}

const toNumber = (value: number | string | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const calculateROI = (input: ROICalculationInput): ROICalculationResult => {
  const purchasePrice = toNumber(input.purchasePrice);
  const annualRent = toNumber(input.annualRent);
  const operatingExpenses = toNumber(input.operatingExpenses);
  const appreciationRate = toNumber(input.appreciationRate);
  const holdingPeriodYears = Math.max(1, toNumber(input.holdingPeriodYears, 1));
  const downPaymentPercent = Math.min(100, Math.max(0, toNumber(input.downPaymentPercent)));
  const closingCosts = toNumber(input.closingCosts);

  const cashDownPayment = purchasePrice * (downPaymentPercent / 100);
  const totalInvestment = cashDownPayment + closingCosts;
  const netAnnualIncome = Math.max(0, annualRent - operatingExpenses);
  const totalRentalIncome = netAnnualIncome * holdingPeriodYears;
  const projectedSalePrice = purchasePrice * Math.pow(1 + appreciationRate / 100, holdingPeriodYears);
  const projectedGain = projectedSalePrice - purchasePrice;
  const totalProfit = totalRentalIncome + projectedGain;
  const investmentBase = totalInvestment || purchasePrice || 1;

  return {
    totalInvestment,
    netAnnualIncome,
    totalRentalIncome,
    projectedSalePrice,
    projectedGain,
    totalProfit,
    cashOnCashReturn: (netAnnualIncome / investmentBase) * 100,
    annualizedROI: (totalProfit / investmentBase / holdingPeriodYears) * 100,
    grossYield: purchasePrice ? (annualRent / purchasePrice) * 100 : 0,
    currency: input.currency || 'NGN',
  };
};

export const estimateDefaultRent = (purchasePrice: number, rentalYieldPercent: number) =>
  Math.round((purchasePrice * rentalYieldPercent) / 100);
