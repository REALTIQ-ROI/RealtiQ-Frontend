import { describe, expect, it } from 'vitest';
import type { AdminSearchResult } from '../../types/adminSearch';
import { ADMIN_SEARCH_TYPES, dedupeAdminResults, isSafeAdminSearchRoute, matchedFieldLabel, normalizeAdminSearchQuery } from './adminSearch';

const result = (type: AdminSearchResult['type'], route: string): AdminSearchResult => ({ type, route, title: 'Record', matchedField: 'name', matchedText: 'Record', updatedAt: '2026-08-31T12:00:00.000Z' });

describe('admin search behavior', () => {
  it('normalizes whitespace without changing Unicode', () => expect(normalizeAdminSearchQuery('  Ọlá   Lagos ')).toBe('Ọlá Lagos'));
  it('defines All records and every 13 contract filters', () => {
    expect(ADMIN_SEARCH_TYPES).toHaveLength(14);
    expect(ADMIN_SEARCH_TYPES.map((item) => item.value)).toEqual(['', 'user', 'landlord', 'property', 'project', 'inquiry', 'payment', 'cart_checkout', 'escrow', 'installment', 'title_verification', 'proxy_inspector', 'proxy_inspection', 'virtual_tour']);
  });
  it.each(['/dashboard/admin/users/abc', '/dashboard/admin/property-details/RTQ-PROP-1', '/admin/proxy-inspections/job-1'])('accepts an existing admin destination: %s', (route) => expect(isSafeAdminSearchRoute(route)).toBe(true));
  it.each(['https://evil.example/x', '//evil.example/x', 'javascript:alert(1)', '/dashboard/admin/not-real/1', '/dashboard/admin/users/1?q=secret', '/dashboard/admin/users\\1'])('rejects unsafe or nonexistent destinations: %s', (route) => expect(isSafeAdminSearchRoute(route)).toBe(false));
  it('deduplicates only type plus route while preserving backend order', () => {
    const first = result('user', '/dashboard/admin/users/1'); const second = result('property', '/dashboard/admin/property-details/1');
    expect(dedupeAdminResults([first, second, first])).toEqual([first, second]);
  });
  it('uses a neutral unknown match label', () => expect(matchedFieldLabel('futureSensitiveName')).toBe('record data'));
});
