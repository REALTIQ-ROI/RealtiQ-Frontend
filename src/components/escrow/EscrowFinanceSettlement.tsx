import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { hasAdminCapability } from '../../services/adminAccessService';
import { escrowFinanceSettlementService, type EscrowSettlementResult } from '../../services/escrowFinanceSettlementService';
import { formatMoneyMinor } from '../../utils/moneyMinor';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

interface Props { escrowId: string }
const message = (raw: unknown) => raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})${raw.requestId ? ` · Request ${raw.requestId}` : ''}` : raw instanceof Error ? raw.message : 'Settlement status could not be loaded.';

const EscrowFinanceSettlement = ({ escrowId }: Props) => {
  const { activeProfile, adminAccess } = useAuth();
  const profileId = activeProfile?.id;
  const canRead = hasAdminCapability(adminAccess, 'finance.read');
  const canManage = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'finance.manage'));
  const [result, setResult] = useState<EscrowSettlementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [mustRefresh, setMustRefresh] = useState(false);
  const requestVersion = useRef(0);
  const submitted = useRef(false);
  const stepUp = useBoundStepUp<EscrowSettlementResult>();

  const refresh = useCallback(async () => {
    if (!profileId || !canRead) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const next = await escrowFinanceSettlementService.get(escrowId);
      if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setResult(next); setMustRefresh(false); }
    } catch (raw) { if (version === requestVersion.current) setError(message(raw)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [canRead, escrowId, profileId]);

  useEffect(() => {
    const version = requestVersion.current;
    queueMicrotask(() => { if (version === requestVersion.current) void refresh(); });
    return () => { requestVersion.current += 1; stepUp.cancel(); };
    // The parent keys this view by escrow and selected profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrowId, profileId]);

  const beginReconcile = async () => {
    if (!canManage || !result?.settlement?.actionEligibility.reconcile || mustRefresh || loading || stepUp.busy || stepUp.challenge) return;
    submitted.current = false;
    await stepUp.begin({ method: 'POST', path: `/api/escrow/${encodeURIComponent(escrowId)}/settlement/reconcile`, body: {}, label: 'Reconcile existing escrow beneficiary transfers', execute: (challengeId) => { submitted.current = true; return escrowFinanceSettlementService.reconcile(escrowId, challengeId); } });
  };
  const beginAuthorize = async () => {
    if (!canManage || mustRefresh || loading || !selectedBeneficiary || !/^\d{4,10}$/.test(authorizationCode.trim()) || stepUp.busy || stepUp.challenge) { setError('Enter the 4 to 10 digit provider authorization code.'); return; }
    const beneficiary = result?.settlement?.beneficiaries.find((item) => item.id === selectedBeneficiary);
    if (!beneficiary || beneficiary.state !== 'pending_authorization' || !result?.settlement?.actionEligibility.authorizeTransferBeneficiaryIds.includes(beneficiary.id)) { setError('Refresh the settlement and choose a transfer awaiting authorization.'); return; }
    const body = { authorizationCode: authorizationCode.trim() };
    submitted.current = false;
    const started = await stepUp.begin({ method: 'POST', path: `/api/escrow/${encodeURIComponent(escrowId)}/settlement/beneficiaries/${encodeURIComponent(beneficiary.id)}/authorize-transfer`, body, label: `Authorize ${beneficiary.role} escrow transfer`, execute: (challengeId, exactBody) => { submitted.current = true; return escrowFinanceSettlementService.authorizeTransfer(escrowId, beneficiary.id, exactBody, challengeId); } });
    if (started) setAuthorizationCode('');
  };
  const complete = async (code: string) => {
    const outcome = await stepUp.complete(code);
    if (!outcome.ok) {
      if (submitted.current) { setMustRefresh(true); await refresh(); }
      setError(outcome.error ?? 'Settlement action not confirmed. Refresh the server state before another attempt.');
      return false;
    }
    setNotice(outcome.value.settlement?.state === 'completed' ? 'The server reports beneficiary settlement complete.' : 'Settlement remains in progress. Check each beneficiary and reconcile the existing references.');
    setSelectedBeneficiary(''); await refresh();
    return true;
  };

  if (!canRead) return null;
  return <section className="mt-6 rounded-xl border bg-white p-5" aria-labelledby="escrow-settlement-heading">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="escrow-settlement-heading" className="text-xl font-bold">Finance settlement</h2><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh settlement</Button></div>
    <p className="mt-2 text-sm text-secondary">This is beneficiary transfer status for this escrow. Merchant collection or a payment redirect does not prove a beneficiary was paid.</p>
    {loading ? <p role="status" className="mt-2 text-sm">Loading beneficiary transfers…</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-error">{error}</p> : null}{notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    {mustRefresh ? <p role="alert" className="mt-2 text-sm">The protected action may have reached the provider. Refresh the existing settlement before another action.</p> : null}
    {result?.settlement ? <>
      <p className="mt-3 text-sm">Settlement state: <strong>{result.settlement.state.replaceAll('_', ' ')}</strong> · Version {result.settlement.version} · Complete: {result.settlement.state === 'completed' ? 'Yes' : 'No'}{result.reconciliationRequired ? ' · Reconciliation required' : ''}</p>
      <ul className="mt-3 space-y-2">{result.settlement.beneficiaries.map((beneficiary) => <li key={beneficiary.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{beneficiary.role}</strong> · {formatMoneyMinor(beneficiary.amountMinor, beneficiary.currency)} · {beneficiary.state.replaceAll('_', ' ')}<p className="mt-1 text-xs text-secondary">{beneficiary.destinationBankName ?? 'Bank not returned'} · {beneficiary.destinationMasked ?? 'Masked destination unavailable'}{beneficiary.transferReference ? ` · Reference ${beneficiary.transferReference}` : ''}</p>{beneficiary.providerCode ? <p className="mt-1 text-xs">Provider state: {beneficiary.providerCode}</p> : null}</li>)}</ul>
      {!result.settlement.beneficiaries.length ? <p className="mt-2 text-sm text-secondary">No beneficiary transfers have been returned.</p> : null}
      {canManage ? <div className="mt-4 space-y-3">{result.settlement.actionEligibility.reconcile ? <Button type="button" variant="secondary" disabled={mustRefresh || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile()}>Reconcile with authenticator</Button> : null}
        {result.settlement.actionEligibility.authorizeTransferBeneficiaryIds.length ? <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Transfer awaiting authorization<select className="mt-1 block rounded-lg border p-2" value={selectedBeneficiary} onChange={(event) => { setSelectedBeneficiary(event.target.value); setAuthorizationCode(''); }}><option value="">Choose transfer</option>{result.settlement.beneficiaries.filter((item) => item.state === 'pending_authorization' && result.settlement?.actionEligibility.authorizeTransferBeneficiaryIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.role} · {formatMoneyMinor(item.amountMinor, item.currency)} · {item.destinationMasked ?? 'masked destination unavailable'}</option>)}</select></label><label className="text-sm">Provider authorization code<input className="mt-1 block rounded-lg border p-2" type="password" inputMode="numeric" autoComplete="off" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} /></label><Button type="button" disabled={!selectedBeneficiary || !/^\d{4,10}$/.test(authorizationCode.trim()) || mustRefresh || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginAuthorize()}>Authorize transfer with authenticator</Button></div> : null}
      </div> : null}
    </> : !loading && !error ? <p className="mt-3 text-sm text-secondary">No settlement record was returned for this escrow.</p> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </section>;
};

export default EscrowFinanceSettlement;
