import { describe, expect, it } from 'vitest';
import { selectProxyActions, shouldPollProxyDetail } from './selectors';
import type { ProxyInspectionDetail, ProxyInspectionStatus, ServiceEscrowStatus } from '../../types/proxyNetwork';

const detail = (status: ProxyInspectionStatus, escrowStatus?: ServiceEscrowStatus): ProxyInspectionDetail => ({
  request: {
    _id: 'request-1', property: 'property-1',
    buyer: { _id: 'buyer-1', name: 'Buyer', role: 'buyer' },
    inspector: { _id: 'inspector-1', name: 'Inspector', role: 'proxy_inspector' },
    inspectorProfile: 'profile-1', requestedServices: ['photos'], status,
    proposedPrice: 25_000, buyerPriceConfirmed: false, inspectorPriceConfirmed: false,
    createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
  },
  serviceEscrow: escrowStatus ? {
    _id: 'escrow-1', serviceType: 'proxy_inspection', serviceReference: 'request-1',
    payer: 'buyer-1', provider: 'inspector-1', grossAmount: 25_000,
    platformFeePercentage: 10, platformFeeAmount: 2_500, providerAmount: 22_500,
    status: escrowStatus,
  } : null,
  report: null, evidence: [], dispute: null,
});

describe('Proxy Network action selectors', () => {
  it.each(['requested', 'negotiating', 'awaiting_price_confirmation'] as ProxyInspectionStatus[])(
    'allows both participants to negotiate in %s',
    (status) => {
      expect(selectProxyActions(detail(status), 'buyer', 'buyer-1').proposePrice).toBe(true);
      expect(selectProxyActions(detail(status), 'proxy_inspector', 'inspector-1').confirmPrice).toBe(true);
      expect(selectProxyActions(detail(status), 'admin', 'admin-1').proposePrice).toBe(false);
    },
  );

  it('requires a backend price lock before Buyer payment is shown', () => {
    const state = detail('awaiting_payment', 'awaiting_payment');
    expect(selectProxyActions(state, 'buyer', 'buyer-1').initializePayment).toBe(false);
    state.request.priceLockedAt = '2026-08-01T10:00:00Z';
    expect(selectProxyActions(state, 'buyer', 'buyer-1').initializePayment).toBe(true);
    expect(selectProxyActions(state, 'landlord', 'buyer-1').initializePayment).toBe(false);
  });

  it('shows Inspector execution controls only for the assigned Inspector in valid states', () => {
    const funded = detail('funded', 'funded');
    expect(selectProxyActions(funded, 'proxy_inspector', 'inspector-1').start).toBe(true);
    expect(selectProxyActions(funded, 'proxy_inspector', 'someone-else').start).toBe(false);
    expect(selectProxyActions(detail('in_progress', 'service_in_progress'), 'buyer', 'buyer-1').uploadEvidence).toBe(false);
    expect(selectProxyActions(detail('in_progress', 'service_in_progress'), 'proxy_inspector', 'inspector-1').editReport).toBe(true);
  });

  it('applies price/report locks and active disputes over stale statuses', () => {
    const negotiating = detail('awaiting_price_confirmation');
    negotiating.request.priceLockedAt = '2026-08-01T10:00:00Z';
    expect(selectProxyActions(negotiating, 'buyer', 'buyer-1').proposePrice).toBe(false);
    const working = detail('in_progress', 'service_in_progress');
    working.request.reportLockedAt = '2026-08-01T10:00:00Z';
    expect(selectProxyActions(working, 'proxy_inspector', 'inspector-1').editReport).toBe(false);
    working.dispute = { _id: 'd1', inspectionRequest: 'request-1', serviceEscrow: 'escrow-1', raisedBy: 'buyer-1', reason: 'Missing coverage', status: 'open', createdAt: '2026-08-01T11:00:00Z' };
    expect(selectProxyActions(working, 'proxy_inspector', 'inspector-1').uploadEvidence).toBe(false);
  });

  it('requires verified payout details and blocks processing-state Admin actions', () => {
    const release = detail('release_pending', 'release_pending');
    expect(selectProxyActions(release, 'admin', 'admin-1', false).releasePayment).toBe(false);
    expect(selectProxyActions(release, 'admin', 'admin-1', true).releasePayment).toBe(true);
    release.serviceEscrow!.status = 'release_processing';
    expect(selectProxyActions(release, 'admin', 'admin-1', true).releasePayment).toBe(false);
    expect(shouldPollProxyDetail(release)).toBe(true);
  });

  it.each(['completed', 'refunded', 'cancelled'] as ProxyInspectionStatus[])(
    'leaves terminal %s states without destructive mutations',
    (status) => {
      const actions = selectProxyActions(detail(status), 'proxy_inspector', 'inspector-1');
      expect(actions.start || actions.uploadEvidence || actions.editReport || actions.submitCompletion).toBe(false);
    },
  );
});
