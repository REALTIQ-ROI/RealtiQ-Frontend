import type { ProjectImportRow } from '../types';

export { downloadBlob } from './download';

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

export const supportedImportFields = new Set(importTemplateColumns);

export const rowDataValue = (row: ProjectImportRow, field: string) => {
  const value = row.data?.[field];
  if (Array.isArray(value)) return value.join(' | ');
  if (value === null || value === undefined) return '';
  return String(value);
};

export const rowDataDisplayValue = (row: ProjectImportRow, field: string, missingLabel = 'N/A') => {
  if (!row.data || !Object.prototype.hasOwnProperty.call(row.data, field)) return missingLabel;
  const value = row.data[field];
  if (value === null) return 'Null';
  if (value === '') return 'Empty';
  return rowDataValue(row, field);
};

export const validateProjectImportFile = (file: File, maxFileMB?: number): string | null => {
  if (!/\.(csv|xlsx)$/i.test(file.name)) return 'Only CSV and XLSX files are supported.';
  if (typeof maxFileMB === 'number' && Number.isFinite(maxFileMB) && maxFileMB >= 0 && file.size > maxFileMB * 1024 * 1024) {
    return `This file is larger than the current project limit of ${maxFileMB} MB.`;
  }
  return null;
};

export const sanitizeImportRowPayload = (values: Record<string, string>, allowedFields: string[]): Record<string, unknown> => {
  const allowed = new Set(allowedFields);
  const payload: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(values)) {
    if (!allowed.has(key)) continue;
    const value = rawValue.trim();
    if (value === '') continue;
    if (['price', 'bedrooms', 'bathrooms', 'squareFeet', 'latitude', 'longitude', 'constructionProgress', 'reservationAmount', 'minimumInitialDeposit', 'installmentDurationMonths'].includes(key)) {
      payload[key] = Number(value.replace(/[₦,\s]/g, ''));
    } else {
      payload[key] = value;
    }
  }
  return payload;
};
