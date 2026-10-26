import { describe, expect, it } from 'vitest';
import { rowDataDisplayValue, sanitizeImportRowPayload, validateProjectImportFile } from './projectImport';
import type { ProjectImportRow } from '../types';

describe('project import helpers', () => {
  it('validates only documented file extensions and the current schema size limit', () => {
    expect(validateProjectImportFile(new File(['rows'], 'units.csv'), 1)).toBeNull();
    expect(validateProjectImportFile(new File(['rows'], 'units.xls'), 1)).toMatch(/Only CSV and XLSX/);
    expect(validateProjectImportFile(new File(['x'.repeat(1024 * 1024 + 1)], 'units.xlsx'), 1)).toMatch(/current project limit/);
    expect(validateProjectImportFile(new File(['x'], 'units.csv'), 0)).toMatch(/current project limit of 0 MB/);
  });

  it('distinguishes missing, null, empty, zero and false row values', () => {
    const row = { rowNumber: 2, status: 'valid', data: { empty: '', zero: 0, disabled: false, nullable: null }, errors: [], warnings: [] } as ProjectImportRow;
    expect(rowDataDisplayValue(row, 'missing')).toBe('N/A');
    expect(rowDataDisplayValue(row, 'nullable')).toBe('Null');
    expect(rowDataDisplayValue(row, 'empty')).toBe('Empty');
    expect(rowDataDisplayValue(row, 'zero')).toBe('0');
    expect(rowDataDisplayValue(row, 'disabled')).toBe('false');
  });

  it('retains explicit numeric zero while omitting blank unchanged values', () => {
    expect(sanitizeImportRowPayload({ price: '0', title: 'Unit A', optional: '' }, ['price', 'title', 'optional']))
      .toEqual({ price: 0, title: 'Unit A' });
  });
});
