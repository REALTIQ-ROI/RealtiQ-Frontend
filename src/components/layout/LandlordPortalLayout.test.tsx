import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandlordPortalLayout from './LandlordPortalLayout';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./ProfileSwitcher', () => ({ default: () => null }));
vi.mock('../../hooks/useHasScrolled', () => ({ default: () => false }));
vi.mock('../../hooks/usePreservedSidebarScroll', () => ({ default: () => null }));

const mockedUseAuth = vi.mocked(useAuth);

const renderLayout = (ownerVerified?: boolean) => {
  mockedUseAuth.mockReturnValue({
    user: { _id: 'landlord-1', name: 'Landlord Example', email: 'landlord@example.test', role: 'owner', ownerVerified },
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);

  return render(
    <MemoryRouter>
      <LandlordPortalLayout active="overview" title="Landlord Dashboard">
        <div>Dashboard content</div>
      </LandlordPortalLayout>
    </MemoryRouter>,
  );
};

describe('LandlordPortalLayout verification notice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a KYC notice and links to landlord verification when ownerVerified is false', () => {
    renderLayout(false);

    expect(screen.getByRole('status')).toHaveTextContent('must be verified before you can add properties');
    expect(within(screen.getByRole('status')).getByRole('link', { name: /complete verification/i })).toHaveAttribute('href', '/dashboard/landlord/settings/verification');
    expect(screen.queryByRole('link', { name: 'Add Property' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /complete verification/i })).toHaveLength(2);
  });

  it('does not show the notice for verified landlords', () => {
    renderLayout(true);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps property creation blocked and links to verification when status is missing', () => {
    renderLayout(undefined);

    expect(screen.getByRole('status')).toHaveTextContent('must be verified before you can add properties');
    expect(screen.queryByRole('link', { name: 'Add Property' })).not.toBeInTheDocument();
  });
});
