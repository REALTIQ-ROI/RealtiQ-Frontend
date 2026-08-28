import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BuyerTrustExperience from './BuyerTrustExperience';
vi.mock('../layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
describe('BuyerTrustExperience', () => {
  it('shows account trust without presenting a seller badge as buyer quality', () => {
    render(<MemoryRouter><BuyerTrustExperience trust={{ publicReference: 'RTQ-TRUST-1', policyVersion: 'v1', score: 72, band: 'strong', badge: 'none', components: { responsiveness: { score: 0, available: false } }, insufficientHistory: false }} appeals={[]} loading={false} error={''} reason={''} submitting={false} notice={''} onReasonChange={vi.fn()} onSubmit={vi.fn()} onRetry={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Seller badge not applicable')).toBeInTheDocument();
    expect(screen.getByText(/not assigned to buyer accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable — not negative evidence/)).toBeInTheDocument();
    expect(screen.queryByText('none badge')).not.toBeInTheDocument();
  });
});
