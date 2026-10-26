import { describe, expect, it } from 'vitest';
import { catalogueFilterChips, removeCatalogueFilterChip } from './catalogueFilterChips';

describe('catalogue filter chips', () => {
  it('shows explicit false, zero, repeated and unknown criteria while hiding pagination and map structure', () => {
    const params = new URLSearchParams('queryVersion=canonical-v1&page=3&mapActive=true&minPrice=0&verified=false&unitFeatures=Pool&unitFeatures=Lift&backendFlag=kept');
    expect(catalogueFilterChips(params).map((chip) => chip.label)).toEqual([
      'min Price: 0', 'verified: No', 'unit Features: Pool', 'unit Features: Lift', 'backend Flag: kept',
    ]);
  });

  it('clears one repeated value and resets pagination without removing unrelated criteria', () => {
    const params = new URLSearchParams('queryVersion=canonical-v1&page=4&unitFeatures=Pool&unitFeatures=Lift&unknown=0&north=10');
    const next = removeCatalogueFilterChip(params, { key: 'unitFeatures', index: 0 });
    expect(next.getAll('unitFeatures')).toEqual(['Lift']);
    expect(next.get('unknown')).toBe('0');
    expect(next.has('north')).toBe(true);
    expect(next.has('page')).toBe(false);
  });
});
