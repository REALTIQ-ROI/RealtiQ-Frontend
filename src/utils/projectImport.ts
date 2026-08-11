import type { ProjectImportRow } from '../types';

export const importTemplateColumns = [
  'title',
  'price',
  'propertyType',
  'bedrooms',
  'bathrooms',
  'squareFeet',
  'description',
  'status',
  'unitName',
  'unitNumber',
  'block',
  'phase',
  'floor',
  'plotNumber',
  'address',
  'country',
  'state',
  'city',
  'area',
  'latitude',
  'longitude',
  'amenities',
  'features',
  'listingType',
  'developmentStatus',
  'constructionProgress',
  'expectedCompletionDate',
  'constructionStartDate',
  'handoverDate',
  'reservationAmount',
  'minimumInitialDeposit',
  'installmentAvailable',
  'installmentDurationMonths',
  'paymentPlanDescription',
  'riskDisclosure',
];

export const readySampleRow = [
  '3 Bedroom Terrace',
  '85000000',
  'house',
  '3',
  '4',
  '2200',
  'Premium terrace unit',
  'available',
  '3 Bedroom Terrace',
  'B12',
  'Block B',
  'Phase 1',
  '',
  '',
  '',
  'Nigeria',
  'Lagos',
  'Lekki',
  'Chevron',
  '',
  '',
  'Security | Gym | Pool',
  'BQ | Balcony',
  'ready',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
];

export const offPlanSampleRow = [
  '2 Bedroom Off-Plan Apartment',
  '55000000',
  'apartment',
  '2',
  '2',
  '1300',
  'Off-plan apartment unit',
  'available',
  '2 Bedroom Apartment',
  'A4',
  'Block A',
  'Phase 1',
  '',
  '',
  '',
  'Nigeria',
  'Lagos',
  'Lekki',
  'Chevron',
  '',
  '',
  'Security | Power',
  'Balcony',
  'off_plan',
  'foundation',
  '25',
  '2027-12-01',
  '2026-09-01',
  '2028-01-15',
  '5000000',
  '11000000',
  'yes',
  '18',
  '20% deposit with balance over 18 months',
  'Estimated completion dates may change.',
];

const csvEscape = (value: string) => `"${value.replaceAll('"', '""')}"`;

export const buildLocalProjectImportCsv = () =>
  [importTemplateColumns, readySampleRow, offPlanSampleRow]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const supportedImportFields = new Set(importTemplateColumns);

export const rowDataValue = (row: ProjectImportRow, field: string) => {
  const value = row.data?.[field];
  if (Array.isArray(value)) return value.join(' | ');
  if (value === null || value === undefined) return '';
  return String(value);
};

export const sanitizeImportRowPayload = (values: Record<string, string>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(values)) {
    if (!supportedImportFields.has(key)) continue;
    const value = rawValue.trim();
    if (value === '') continue;
    if (['price', 'bedrooms', 'bathrooms', 'squareFeet', 'latitude', 'longitude', 'constructionProgress', 'reservationAmount', 'minimumInitialDeposit', 'installmentDurationMonths'].includes(key)) {
      payload[key] = Number(value.replace(/[₦,\s]/g, ''));
    } else {
      payload[key] = value;
    }
  }
  payload.status = 'available';
  return payload;
};
