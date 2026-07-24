import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TitleVerificationBadge from './TitleVerificationBadge';

describe('TitleVerificationBadge', () => {
  it('shows published public badges and registry links', () => {
    render(
      <MemoryRouter>
        <TitleVerificationBadge
          context="public"
          summary={{ status: 'published', publicVerificationId: 'RTQ-TV-2026-000001', badgeLabel: 'Title Published in RealtiQ Registry' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /title published in realtiq registry/i })).toHaveAttribute(
      'href',
      '/title-verification/RTQ-TV-2026-000001',
    );
  });

  it('hides non-published statuses in public context and shows external anchor completion for owners', () => {
    const { rerender } = render(<TitleVerificationBadge context="public" summary={{ status: 'pending' }} />);
    expect(screen.queryByText(/title review pending/i)).not.toBeInTheDocument();

    rerender(<TitleVerificationBadge context="owner" summary={{ status: 'published', externalAnchorStatus: 'anchored' }} />);
    expect(screen.getByText(/external anchor completed/i)).toBeInTheDocument();
  });

  it('shows a mixed multi-document verification count instead of marking the property unverified', () => {
    render(
      <TitleVerificationBadge
        context="public"
        summary={{ status: 'pending' }}
        documents={[
          { verificationStatus: 'published' },
          { verificationStatus: 'approved' },
          { verificationStatus: 'pending' },
        ]}
      />,
    );

    expect(screen.getByText('2 of 3 Title Documents Verified')).toBeInTheDocument();
    expect(screen.queryByText('Title Document Not Verified')).not.toBeInTheDocument();
  });
});
