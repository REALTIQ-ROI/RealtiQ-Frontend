import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { propertyService, type PropertyPriceHistoryResponse } from '../../services/propertyService';
import PriceHistorySection from './PriceHistorySection';

vi.mock('../analytics/SimpleLineChart', () => ({ default: () => <div>Chart</div> }));
vi.mock('../../services/propertyService', () => ({
  propertyService: {
    getPriceHistory: vi.fn(),
    getPriceHistoryChart: vi.fn(),
  },
}));

describe('public price history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps paginated history available when the separate chart fails', async () => {
    vi.mocked(propertyService.getPriceHistory).mockImplementation(async (_id, query) => ({
      property: { id: 'property-1', title: 'Home', currentPrice: 40_000_000, currency: 'NGN' },
      summary: { initialPrice: 45_000_000, currentPrice: 40_000_000, absoluteChange: -5_000_000, percentageChange: -11.11, highestPrice: 45_000_000, lowestPrice: 40_000_000, numberOfChanges: 25 },
      history: [], total: 25, page: query?.page ?? 1, limit: 20,
    } as PropertyPriceHistoryResponse));
    vi.mocked(propertyService.getPriceHistoryChart).mockRejectedValue(new Error('Chart provider unavailable'));

    render(<PriceHistorySection propertyId="property-1" />);

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/Price chart unavailable:/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    await waitFor(() => expect(propertyService.getPriceHistory).toHaveBeenCalledWith('property-1', { page: 2, limit: 20, sort: 'desc' }));
  });

  it('renders unavailable percentages when the API returns null instead of crashing', async () => {
    vi.mocked(propertyService.getPriceHistory).mockResolvedValue({
      property: { id: 'property-1', title: 'Home', currentPrice: 40_000_000, currency: 'NGN' },
      summary: { initialPrice: 45_000_000, currentPrice: 40_000_000, absoluteChange: -5_000_000, percentageChange: null, highestPrice: 45_000_000, lowestPrice: 40_000_000, numberOfChanges: 1 },
      history: [{
        _id: 'history-1', property: 'property-1', previousPrice: 45_000_000, newPrice: 40_000_000,
        currency: 'NGN', absoluteChange: -5_000_000, percentageChange: null, changeType: 'decrease',
        effectiveAt: '2026-10-01T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z',
      }],
      total: 1, page: 1, limit: 20,
    });
    vi.mocked(propertyService.getPriceHistoryChart).mockResolvedValue({ propertyId: 'property-1', currency: 'NGN', series: [] });

    render(<PriceHistorySection propertyId="property-1" />);

    expect(await screen.findAllByText('—')).toHaveLength(2);
  });
});
