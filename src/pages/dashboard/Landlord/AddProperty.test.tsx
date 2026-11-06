import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddProperty from './AddProperty';
import { useAuth } from '../../../contexts/AuthContext';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../contexts/PropertiesContext', () => ({ useProperties: () => ({ addProperty: vi.fn() }) }));
vi.mock('../../../hooks/useBoundStepUp', () => ({
  useBoundStepUp: () => ({ challenge: null, busy: false, error: null, begin: vi.fn(), complete: vi.fn(), cancel: vi.fn() }),
}));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: () => null }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/property/PropertyForm', () => ({ default: () => <form aria-label="Property form" /> }));

const mockedUseAuth = vi.mocked(useAuth);

const renderAddProperty = (ownerVerified: boolean | undefined) => {
  mockedUseAuth.mockReturnValue({
    user: { _id: 'landlord-1', name: 'Landlord Example', email: 'landlord@example.test', role: 'owner', ownerVerified },
    activeProfile: { id: 'landlord-profile', name: 'Landlord Example', type: 'owner', status: 'active' },
  } as ReturnType<typeof useAuth>);

  return render(<MemoryRouter><AddProperty /></MemoryRouter>);
};

describe('AddProperty landlord verification gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not mount the property form for an unverified landlord and links to KYC', () => {
    renderAddProperty(false);

    expect(screen.queryByRole('form', { name: 'Property form' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Landlord verification required' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to verification' })).toHaveAttribute('href', '/dashboard/landlord/settings/verification');
  });

  it('does not allow property creation when verification status is missing', () => {
    renderAddProperty(undefined);

    expect(screen.queryByRole('form', { name: 'Property form' })).not.toBeInTheDocument();
  });

  it('shows the property form for a verified landlord', () => {
    renderAddProperty(true);

    expect(screen.getByRole('form', { name: 'Property form' })).toBeInTheDocument();
  });
});
