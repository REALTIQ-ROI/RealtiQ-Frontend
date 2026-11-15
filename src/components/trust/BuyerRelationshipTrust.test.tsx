import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { group07Service } from '../../services/group07Service';
import BuyerRelationshipTrust from './BuyerRelationshipTrust';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'seller-profile', kind: 'owner' } }) }));
vi.mock('../../services/group07Service', () => ({ group07Service: { trustRelationship: vi.fn(), createTrustReview: vi.fn() } }));

describe('BuyerRelationshipTrust', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads private relationship trust and rates only the supplied completed source', async () => {
    const user = userEvent.setup();
    vi.mocked(group07Service.trustRelationship).mockResolvedValue({
      profileId: 'buyer-profile', trust: { state: 'established', tier: 'Bronze', score: 72, rating: { average: 4.5, qualifyingReviewCount: 2 } },
    } as never);
    vi.mocked(group07Service.createTrustReview).mockResolvedValue({
      review: { id: 'review-1', buyerProfileId: 'buyer-profile', reviewerProfileId: 'seller-profile', sourceKind: 'escrow', sourceId: 'escrow-1', rating: 5, createdAt: '2026-11-10T10:00:00Z' },
      changed: true,
    } as never);

    render(<BuyerRelationshipTrust buyerProfileId="buyer-profile" sourceKind="escrow" sourceId="escrow-1" eligibleSource />);
    await user.click(screen.getByRole('button', { name: 'View relationship' }));
    expect(await screen.findByText(/Current relationship trust: 72\/100 · Bronze/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Rate this relationship'), '5');
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));

    await waitFor(() => expect(group07Service.createTrustReview).toHaveBeenCalledWith('buyer-profile', {
      sourceKind: 'escrow', sourceId: 'escrow-1', rating: 5,
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your rating was recorded for this completed relationship.');
    expect(screen.queryByRole('button', { name: 'Submit rating' })).not.toBeInTheDocument();
  });
});
