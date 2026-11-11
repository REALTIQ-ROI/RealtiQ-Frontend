import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LandlordKycProgressTracker from './LandlordKycProgressTracker';
import { buildLandlordKycProgress } from '../../utils/landlordKycProgress';

describe('LandlordKycProgressTracker', () => {
  it('shows the workflow steps, actionable links, and server-confirmed progress', () => {
    const progress = buildLandlordKycProgress({
      verificationStatus: 'under_review',
      cases: [{ id: 'kyc-case-1', state: 'under_review', submittedAt: '2026-10-31T10:00:00.000Z' }],
      availableEvidenceCount: 2,
      hasOnboardingDraft: true,
    });

    render(<MemoryRouter><LandlordKycProgressTracker progress={progress} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'KYC progress' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'KYC completion progress' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('Waiting for review')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to evidence upload' })).toHaveAttribute('href', '#kyc-evidence-upload');
    expect(screen.getByRole('link', { name: 'Go to case submission' })).toHaveAttribute('href', '#kyc-case-submission');
    expect(screen.getByText(/authorized reviewer/i)).toBeInTheDocument();
  });

  it('clearly marks completion only for a server-approved KYC state', () => {
    const progress = buildLandlordKycProgress({
      verificationStatus: 'approved',
      cases: [],
      availableEvidenceCount: 2,
      hasOnboardingDraft: true,
    });

    render(<MemoryRouter><LandlordKycProgressTracker progress={progress} /></MemoryRouter>);

    expect(screen.getByText('KYC approved')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'KYC completion progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/KYC has been approved/i)).toBeInTheDocument();
  });

  it('names the missing profile field and links directly to the editable KYC draft', () => {
    const progress = buildLandlordKycProgress({
      verificationStatus: 'not_submitted',
      cases: [],
      availableEvidenceCount: 0,
      hasOnboardingDraft: true,
      intakeMissingCount: 1,
      intakeMissingFields: ['Country of residence'],
    });

    render(<MemoryRouter><LandlordKycProgressTracker progress={progress} /></MemoryRouter>);

    expect(screen.getByText(/Complete Country of residence before adding evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/profile draft still needs: Country of residence/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Complete profile details' })).toHaveAttribute('href', '#kyc-profile-draft');
  });

  it('does not let an older approved case override the current profile verification status', () => {
    const progress = buildLandlordKycProgress({
      verificationStatus: 'not_submitted',
      cases: [{ id: 'older-approved-case', state: 'approved', submittedAt: '2026-10-31T10:00:00.000Z' }],
      availableEvidenceCount: 2,
      hasOnboardingDraft: true,
    });

    expect(progress.approved).toBe(false);
    expect(progress.summary).toMatch(/not confirmed as approved/i);
  });

  it('keeps later step links unavailable until the prior KYC step is complete', () => {
    const progress = buildLandlordKycProgress({
      verificationStatus: 'not_submitted',
      cases: [],
      availableEvidenceCount: 0,
      hasOnboardingDraft: true,
    });

    render(<MemoryRouter><LandlordKycProgressTracker progress={progress} /></MemoryRouter>);

    expect(screen.getByRole('progressbar', { name: 'KYC completion progress' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByRole('link', { name: 'Go to evidence upload' })).toBeInTheDocument();
    expect(screen.getByText('Available after evidence')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to case submission' })).not.toBeInTheDocument();
    expect(screen.getByText('Available after submission')).toBeInTheDocument();
  });
});
