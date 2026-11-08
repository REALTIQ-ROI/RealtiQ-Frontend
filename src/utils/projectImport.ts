import type { ProjectImportRow } from '../types';

export { downloadBlob } from './download';

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

export const sanitizeImportRowPayload = (values: Record<string, string>, allowedFields: string[], numericFields: ReadonlySet<string> = new Set()): Record<string, unknown> => {
  const allowed = new Set(allowedFields);
  const payload: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(values)) {
    if (!allowed.has(key)) continue;
    const value = rawValue.trim();
    if (value === '') continue;
    if (numericFields.has(key)) {
      payload[key] = Number(value.replace(/[₦,\s]/g, ''));
    } else {
      payload[key] = value;
    }
  }
  return payload;
};
