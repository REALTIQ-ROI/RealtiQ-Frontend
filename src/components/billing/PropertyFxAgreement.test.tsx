import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyFxAgreement from './PropertyFxAgreement';
import { fxAgreementService, type FxAgreement } from '../../services/fxAgreementService';

const auth = vi.hoisted(() => ({ role: 'buyer', profileId: 'buyer-profile' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: auth.role }, activeProfile: { id: auth.profileId } }) }));
vi.mock('../../services/fxAgreementService', () => ({ fxAgreementService: { list: vi.fn(), propose: vi.fn(), confirm: vi.fn() } }));

const agreement = (status: string): FxAgreement => ({ id: 'agreement-1', propertyId: 'property-1', buyerProfileId: 'buyer-profile', sellerProfileId: 'seller-profile', listedCurrency: 'USD', listedAmountMinor: 10000, payableCurrency: 'NGN', payableAmountMinor: 16000000, rateNgnPerUsd: 1600, status, version: 1, buyerConfirmedAt: '2026-11-10T10:00:00.000Z', sellerConfirmedAt: null, consumedAt: null, expiresAt: '2099-01-01T00:00:00.000Z' });

describe('PropertyFxAgreement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'buyer'; auth.profileId = 'buyer-profile';
    localStorage.setItem('activeProfileId', auth.profileId);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('proposes only the buyer-entered whole NGN amount and uses a stable operation key', async () => {
    vi.mocked(fxAgreementService.list).mockResolvedValue([]);
    vi.mocked(fxAgreementService.propose).mockResolvedValue({ agreement: agreement('proposed'), idempotent: false });
    render(<PropertyFxAgreement propertyId="property-1" onSelect={vi.fn()} />);
    await screen.findByText(/No FX agreements returned/);
    await userEvent.type(screen.getByLabelText('Agreed amount (whole NGN)'), '160000');
    await userEvent.click(screen.getByRole('button', { name: 'Propose amount' }));
    await waitFor(() => expect(fxAgreementService.propose).toHaveBeenCalledWith({ propertyId: 'property-1', payableAmountMinor: 16000000, operationKey: expect.stringMatching(/^fx_[a-f\d-]{36}$/) }));
  });

  it('allows the returned seller profile to confirm by current version', async () => {
    auth.role = 'owner'; auth.profileId = 'seller-profile'; localStorage.setItem('activeProfileId', auth.profileId);
    vi.mocked(fxAgreementService.list).mockResolvedValue([agreement('proposed')]);
    vi.mocked(fxAgreementService.confirm).mockResolvedValue({ ...agreement('confirmed'), version: 2 });
    render(<PropertyFxAgreement propertyId="property-1" onSelect={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm as seller' }));
    expect(fxAgreementService.confirm).toHaveBeenCalledWith('agreement-1', 1);
  });

  it('selects only a current, unconsumed confirmed agreement for payment', async () => {
    vi.mocked(fxAgreementService.list).mockResolvedValue([agreement('confirmed'), { ...agreement('confirmed'), id: 'consumed', consumedAt: '2026-11-10T10:00:00.000Z' }]);
    const onSelect = vi.fn();
    render(<PropertyFxAgreement propertyId="property-1" onSelect={onSelect} />);
    await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith('agreement-1'));
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });
});
