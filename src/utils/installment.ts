import type {
  Installment,
  InstallmentCondition,
  InstallmentFrequency,
  InstallmentScheduleItem,
  LegacyInstallmentSchedule,
  Property,
  TourPropertySummary,
  UserRole,
} from '../types';

export const INSTALLMENT_ONLY_THRESHOLD = 50_000_000;

export const installmentCounts = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
} as const;

export const frequencyToInstallmentCount = (frequency?: string): number => {
  if (!frequency) return 0;
  return installmentCounts[frequency as keyof typeof installmentCounts] ?? 0;
};

export const parseInstallmentAmount = (notes?: string): number => {
  if (!notes) return 0;
  const parsed = Number(notes);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const calculateInstallmentAmount = (propertyPrice: number, frequency?: string): number => {
  const count = frequencyToInstallmentCount(frequency);
  if (propertyPrice <= 0 || count <= 0) return 0;
  return Math.round(propertyPrice / count);
};

export const requiresInstallments = (propertyPrice: number): boolean => propertyPrice > INSTALLMENT_ONLY_THRESHOLD;

type InstallmentPropertyRef = Property | TourPropertySummary | string | null;

export const getInstallmentProperty = (installment: Installment): InstallmentPropertyRef =>
  installment.property ?? installment.propertyId ?? null;

export const resolveInstallmentProperty = (installment: Installment): Property | null => {
  const property = getInstallmentProperty(installment);
  return property && typeof property !== 'string' && 'price' in property ? property : null;
};

export const resolveInstallmentPropertyId = (installment: Installment): string => {
  const property = getInstallmentProperty(installment);
  if (!property) return '';
  return typeof property === 'string' ? property : property._id;
};

export const resolveInstallmentPropertyLabel = (installment: Installment): string => {
  const property = getInstallmentProperty(installment);
  if (!property) return 'Property unavailable';
  return typeof property === 'string' ? property : property.title ?? property._id ?? 'Property unavailable';
};

export const resolveInstallmentBuyer = (installment: Installment) => {
  const buyer = installment.buyer ?? installment.user ?? installment.buyerId ?? null;
  return buyer && typeof buyer !== 'string' ? buyer : null;
};

export const resolveInstallmentBuyerLabel = (installment: Installment): string => {
  const buyer = resolveInstallmentBuyer(installment);
  if (buyer?.name) return buyer.name;
  const raw = installment.buyer ?? installment.user ?? installment.buyerId;
  return typeof raw === 'string' ? raw : 'Buyer unavailable';
};

export const isStructuredSchedule = (schedule: Installment['schedule']): schedule is InstallmentScheduleItem[] =>
  Array.isArray(schedule);

export const getScheduleItems = (installment: Installment): InstallmentScheduleItem[] =>
  isStructuredSchedule(installment.schedule)
    ? [...installment.schedule].sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0))
    : [];

export const getLegacySchedule = (installment: Installment): LegacyInstallmentSchedule | null =>
  installment.schedule && !Array.isArray(installment.schedule) ? installment.schedule : null;

export const getPrincipalAmount = (installment: Installment): number =>
  Number(installment.principalAmount ?? installment.totalAmount ?? 0);

export const getPrincipalPaidAmount = (installment: Installment): number =>
  Number(installment.principalPaidAmount ?? installment.paidAmount ?? installment.amountPaid ?? 0);

export const getPrincipalRemainingBalance = (installment: Installment): number => {
  if (typeof installment.principalRemainingBalance === 'number') return installment.principalRemainingBalance;
  const principal = getPrincipalAmount(installment);
  const paid = getPrincipalPaidAmount(installment);
  return Math.max(principal - paid, 0);
};

export const getOutstandingPenaltyAmount = (installment: Installment): number =>
  Number(installment.outstandingPenaltyAmount ?? 0);

export const getTotalOutstandingBalance = (installment: Installment): number =>
  Number(
    installment.totalOutstandingBalance ??
      installment.remainingBalance ??
      getPrincipalRemainingBalance(installment) + getOutstandingPenaltyAmount(installment),
  );

export const getNextPayableScheduleItem = (installment: Installment): InstallmentScheduleItem | null =>
  getScheduleItems(installment).find((item) => Number(item.remainingAmount ?? item.expectedAmount ?? 0) > 0) ?? null;

export const hasUnsatisfiedRequiredConditions = (item?: InstallmentScheduleItem | null): boolean =>
  Boolean(item?.conditions?.some((condition) => condition.required !== false && !condition.satisfied));

export const canRoleSatisfyCondition = (role: UserRole | undefined, condition: InstallmentCondition): boolean => {
  if (!role || condition.satisfied) return false;
  if (role === 'buyer') return condition.type === 'buyer_confirmation';
  if (role === 'landlord') return condition.type === 'seller_confirmation' || condition.type === 'handover';
  return ['inspection_completed', 'document_verified', 'construction_stage', 'admin_approval', 'custom'].includes(
    condition.type,
  );
};

export const canPayInstallment = (installment: Installment): boolean =>
  !['completed', 'cancelled', 'defaulted'].includes(installment.status) && getTotalOutstandingBalance(installment) > 0;

export const hasSuccessfulInstallmentPayment = (installment: Installment): boolean =>
  getPrincipalPaidAmount(installment) > 0 ||
  Boolean(installment.paymentHistory?.some((payment) => payment.status === 'paid' || payment.status === 'successful'));

export const canCancelInstallment = (installment: Installment, role: UserRole | undefined): boolean => {
  if (!role || installment.status === 'completed' || installment.status === 'cancelled') return false;
  if (role === 'admin') return true;
  return role === 'buyer' && installment.status === 'pending' && !hasSuccessfulInstallmentPayment(installment);
};

export const validateAutomaticInstallmentDraft = ({
  propertyPrice,
  numberOfInstallments,
  initialDeposit = 0,
  startDate,
  gracePeriodHours = 0,
}: {
  propertyPrice: number;
  numberOfInstallments: number;
  initialDeposit?: number;
  startDate: string;
  gracePeriodHours?: number;
}) => ({
  valid:
    propertyPrice > 0 &&
    Number.isInteger(numberOfInstallments) &&
    numberOfInstallments > 0 &&
    initialDeposit >= 0 &&
    initialDeposit < propertyPrice &&
    Boolean(asValidDate(startDate)) &&
    gracePeriodHours >= 0,
});

const asValidDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const validateCustomInstallmentDraft = ({
  propertyPrice,
  rows,
  gracePeriodHours = 0,
}: {
  propertyPrice: number;
  rows: Array<{ sequence: number; title: string; expectedAmount: number; dueDate: string }>;
  gracePeriodHours?: number;
}) => {
  const total = rows.reduce((sum, row) => sum + Number(row.expectedAmount || 0), 0);
  const sequenceSet = new Set(rows.map((row) => row.sequence));
  const duplicateSequences = sequenceSet.size !== rows.length;
  const invalidRows = rows.some(
    (row) => !row.title.trim() || !Number.isFinite(row.expectedAmount) || row.expectedAmount <= 0 || !asValidDate(row.dueDate),
  );
  const unorderedDates = rows.some((row, index) => {
    if (index === 0) return false;
    const previous = asValidDate(rows[index - 1].dueDate);
    const current = asValidDate(row.dueDate);
    return Boolean(previous && current && current <= previous);
  });

  return {
    valid:
      propertyPrice > 0 &&
      rows.length > 0 &&
      total === propertyPrice &&
      gracePeriodHours >= 0 &&
      !duplicateSequences &&
      !invalidRows &&
      !unorderedDates,
    total,
    duplicateSequences,
    unorderedDates,
    invalidRows,
    difference: total - propertyPrice,
  };
};

export const getInstallmentSummary = (installment: Installment) => {
  const items = getScheduleItems(installment);
  const legacySchedule = getLegacySchedule(installment);
  const totalInstallments = items.length || frequencyToInstallmentCount(legacySchedule?.frequency ?? installment.frequency);
  const installmentAmount =
    getNextPayableScheduleItem(installment)?.remainingAmount ??
    parseInstallmentAmount(legacySchedule?.notes) ??
    installment.nextPaymentAmount ??
    installment.nextDueAmount ??
    0;
  const paidAmount = getPrincipalPaidAmount(installment);
  const paymentCount =
    installment.paymentCount ??
    installment.installmentsPaid ??
    items.filter((item) => item.status === 'paid' || Number(item.remainingAmount ?? 0) <= 0).length ??
    installment.paymentHistory?.length ??
    0;
  const installmentsRemaining = totalInstallments > 0 ? Math.max(totalInstallments - paymentCount, 0) : 0;
  const principal = getPrincipalAmount(installment);
  const progressPercent = principal > 0 ? Math.min(100, Math.round((paidAmount / principal) * 100)) : 0;
  const completed = installment.status === 'completed' || getTotalOutstandingBalance(installment) <= 0;

  return {
    totalInstallments,
    installmentAmount,
    paidAmount,
    paymentCount,
    installmentsRemaining,
    progressPercent,
    completed,
    principal,
    principalRemaining: getPrincipalRemainingBalance(installment),
    outstandingPenalty: getOutstandingPenaltyAmount(installment),
    totalOutstanding: getTotalOutstandingBalance(installment),
  };
};

export const isInstallmentActive = (installment: Installment) =>
  ['pending', 'active', 'overdue', 'defaulted'].includes(installment.status) && !getInstallmentSummary(installment).completed;

export const buildInstallmentPayload = (
  property: Property,
  frequency: InstallmentFrequency,
): { totalAmount: number; installmentAmount: number } => {
  const totalAmount = property.price;
  const installmentAmount = calculateInstallmentAmount(property.price, frequency);
  return { totalAmount, installmentAmount };
};
