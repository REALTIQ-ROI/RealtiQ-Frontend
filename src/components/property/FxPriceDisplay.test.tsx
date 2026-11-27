import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FxPriceDisplay from './FxPriceDisplay';

const useFxDisplayMock = vi.fn();
vi.mock('../../contexts/FxDisplayContext', () => ({ useFxDisplay: () => useFxDisplayMock() }));

describe('FxPriceDisplay', () => {
  it('does not convert or replace Price on application', () => {
    useFxDisplayMock.mockReturnValue({ displayCurrency: 'NGN', officialRate: { amount: 1500.25 } });
    render(<FxPriceDisplay amount={100} currency="USD" priceOnApplication />);
    expect(screen.getByText('Price on application')).toBeInTheDocument();
    expect(screen.queryByText(/original listing price/i)).not.toBeInTheDocument();
  });

  it('shows the original listing currency and an unavailable notice when no rate exists', () => {
    useFxDisplayMock.mockReturnValue({ displayCurrency: 'NGN', officialRate: null });
    render(<FxPriceDisplay amount={100} currency="USD" />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/conversion is unavailable; showing the original listing price/i)).toBeInTheDocument();
  });
});
