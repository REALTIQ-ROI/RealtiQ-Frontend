import { describe, expect, it } from 'vitest';
import { buildProjectImportMapping, IGNORE_IMPORT_COLUMN, parseCsvHeader } from './projectImportMapping';

describe('strict project import column mapping', () => {
  it('serializes eligible canonical targets and explicit ignored columns', () => {
    expect(buildProjectImportMapping([
      { columnNumber: '1', field: 'unitNumber' },
      { columnNumber: '2', field: 'price' },
      { columnNumber: '3', field: IGNORE_IMPORT_COLUMN },
    ], ['unitNumber', 'price'])).toEqual({ mappings: [
      { columnNumber: 1, field: 'unitNumber' }, { columnNumber: 2, field: 'price' }, { columnNumber: 3, field: null },
    ] });
  });

  it('rejects duplicate columns, duplicate targets and invalid fields', () => {
    expect(() => buildProjectImportMapping([{ columnNumber: '1', field: 'price' }, { columnNumber: '1', field: 'unitNumber' }], ['price', 'unitNumber'])).toThrow(/appears more than once/);
    expect(() => buildProjectImportMapping([{ columnNumber: '1', field: 'price' }, { columnNumber: '2', field: 'price' }], ['price'])).toThrow(/more than one source column/);
    expect(() => buildProjectImportMapping([{ columnNumber: '1', field: 'secret' }], ['price'])).toThrow(/not eligible/);
  });

  it('parses quoted CSV header cells and escaped quotes', () => {
    expect(parseCsvHeader('"Unit, number","Title ""display""",Price\n1,House,0')).toEqual(['Unit, number', 'Title "display"', 'Price']);
  });
});
