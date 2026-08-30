import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TrustProgressChecklist from './TrustProgressChecklist';
import SellerTrustBadge from './SellerTrustBadge';

describe('trust progress UI', () => {
  it('derives progress from returned evidence and keeps unavailable evidence neutral', () => {
    render(<TrustProgressChecklist role={'buyer'} trust={{ publicReference: 'RTQ-TRUST-1', policyVersion: 'v1', score: 50, band: 'standard', badge: 'none', components: { identity: { score: 100 }, transactions: { score: 0, count: 0 }, ratings: { score: 0, count: 0 }, responsiveness: { score: 0, available: false } } }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 4 evidence areas recorded');
    expect(screen.getByText('Evidence unavailable')).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee a score or badge/i)).toBeInTheDocument();
  });

  it('renders earned seller tiers and hides a none badge', () => {
    const { rerender } = render(<SellerTrustBadge badge={'gold'} />);
    expect(screen.getByLabelText('gold RealtIQ trust badge')).toBeInTheDocument();
    rerender(<SellerTrustBadge badge={'none'} />);
    expect(screen.getByText('No badge yet')).toBeInTheDocument();
    rerender(<SellerTrustBadge />);
    expect(screen.getByText('Badge unavailable')).toBeInTheDocument();
  });
});
