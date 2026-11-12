import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddProperty from './AddProperty';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError } from '../../../lib/axios';

const mocks = vi.hoisted(() => ({ addProperty: vi.fn(), begin: vi.fn() }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../contexts/PropertiesContext', () => ({ useProperties: () => ({ addProperty: mocks.addProperty }) }));
vi.mock('../../../hooks/useBoundStepUp', () => ({
  useBoundStepUp: () => ({ challenge: null, busy: false, error: null, begin: mocks.begin, complete: vi.fn(), cancel: vi.fn() }),
}));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: () => null }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/property/PropertyForm', () => ({ default: ({ onSubmit }: { onSubmit: (payload: { publicationAction: 'save_draft' | 'submit_for_review'; canonicalFields: { headline: string } }) => Promise<unknown> }) => <><form aria-label="Property form" /><button type="button" onClick={() => void onSubmit({ publicationAction: 'save_draft', canonicalFields: { headline: 'Draft headline' } })}>Mock save draft</button><button type="button" onClick={() => void onSubmit({ publicationAction: 'submit_for_review', canonicalFields: { headline: 'Review headline' } })}>Mock submit for review</button></> }));

const mockedUseAuth = vi.mocked(useAuth);

const renderAddProperty = (ownerVerified: boolean | undefined) => {
  mockedUseAuth.mockReturnValue({
    user: { _id: 'landlord-1', name: 'Landlord Example', email: 'landlord@example.test', role: 'owner', ownerVerified },
    activeProfile: { id: 'landlord-profile', name: 'Landlord Example', type: 'owner', status: 'active' },
  } as unknown as ReturnType<typeof useAuth>);

  return render(<MemoryRouter><AddProperty /></MemoryRouter>);
};

describe('AddProperty landlord verification gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.begin.mockResolvedValue(true);
    mocks.addProperty.mockResolvedValue({ property: { _id: 'property-1' }, message: 'Saved' });
  });

  it('does not mount the property form for an unverified landlord and links to KYC', () => {
    renderAddProperty(false);

    expect(screen.queryByRole('form', { name: 'Property form' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Owner verification required' })).toBeInTheDocument();
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

  it('sends explicit save_draft for drafts and omits the action when submitting for review', async () => {
    const user = userEvent.setup();
    renderAddProperty(true);
    await user.click(screen.getByRole('button', { name: 'Mock save draft' }));
    expect(mocks.addProperty).toHaveBeenLastCalledWith('landlord-1', expect.objectContaining({ publicationAction: 'save_draft' }));

    await user.click(screen.getByRole('button', { name: 'Mock submit for review' }));
    const submitBody = mocks.addProperty.mock.calls[1]?.[1];
    expect(submitBody).not.toHaveProperty('publicationAction');
  });

  it('binds step-up to the exact create body sent by the listing API', async () => {
    const user = userEvent.setup();
    mocks.addProperty.mockRejectedValueOnce(new ApiRequestError('Step-up required', { status: 403, code: 'AUTH_STEP_UP_REQUIRED' }));
    renderAddProperty(true);
    await user.click(screen.getByRole('button', { name: 'Mock submit for review' }));
    expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/properties',
      body: { canonicalFields: { headline: 'Review headline' } },
    }));
  });
});
