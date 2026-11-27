import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FxDisplayProvider } from '../../contexts/FxDisplayContext';
import type { CanonicalFieldDictionary } from '../../services/canonicalFieldService';
import FxDisplayControl from './FxDisplayControl';

const fxConfiguration: { currentRate: Record<string, unknown> | null; conversionEnabled: boolean; state: string } = {
  state: 'configured',
  conversionEnabled: true,
  currentRate: {
    amount: 1500.25,
    baseCurrency: 'USD',
    quoteCurrency: 'NGN',
    source: 'Central Bank of Nigeria',
    provider: 'cbn_nfem',
    series: 'NFEM_DAILY_VWAP',
    rateDate: '2026-11-26',
    effectiveAt: '2026-11-26T08:00:00.000Z',
    recordedAt: '2026-11-26T09:00:00.000Z',
  },
};
const dictionary = { version: 3, fields: [], configuration: { fx: fxConfiguration } } as unknown as CanonicalFieldDictionary;
const dictionaryHook = vi.hoisted(() => ({ value: null as CanonicalFieldDictionary | null, refresh: vi.fn() }));

vi.mock('../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: dictionaryHook.value, loading: false, error: null, refresh: dictionaryHook.refresh }),
}));

const SearchProbe = () => <output aria-label="Current search">{useLocation().search}</output>;

describe('FxDisplayControl', () => {
  beforeEach(() => {
    localStorage.clear();
    dictionaryHook.value = dictionary;
    fxConfiguration.state = 'configured';
    fxConfiguration.conversionEnabled = true;
    fxConfiguration.currentRate = {
      amount: 1500.25, baseCurrency: 'USD', quoteCurrency: 'NGN', source: 'Central Bank of Nigeria', provider: 'cbn_nfem',
      series: 'NFEM_DAILY_VWAP', rateDate: '2026-11-26', effectiveAt: '2026-11-26T08:00:00.000Z', recordedAt: '2026-11-26T09:00:00.000Z',
    };
  });

  it('shows CBN NFEM metadata and changes only the display preference, not search filters', () => {
    render(<MemoryRouter initialEntries={['/properties?bedrooms=3&sort=recommended&currency=NGN']}><FxDisplayProvider><FxDisplayControl /><SearchProbe /></FxDisplayProvider></MemoryRouter>);
    const rateStatus = screen.getByText(/1 USD =/).closest('[role="status"]');
    expect(rateStatus).toHaveTextContent('1 USD = ₦1,500.25');
    expect(rateStatus).toHaveTextContent('CBN NFEM');
    expect(rateStatus).toHaveTextContent('Rate date 26 Nov 2026');
    expect(rateStatus).toHaveTextContent('Updated');
    fireEvent.change(screen.getByLabelText('Display currency'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?bedrooms=3&sort=recommended&currency=NGN');
    expect(localStorage.getItem('realtiq:display-currency:v1')).toBe('USD');
  });

  it('keeps the original-price unavailable state when the backend has no current rate', () => {
    fxConfiguration.currentRate = null;
    fxConfiguration.state = 'unavailable';
    render(<MemoryRouter><FxDisplayProvider><FxDisplayControl /></FxDisplayProvider></MemoryRouter>);
    expect(screen.getByText(/Currency conversion is unavailable/)).toHaveTextContent('Currency conversion is unavailable. Original listing prices are shown.');
  });
});
