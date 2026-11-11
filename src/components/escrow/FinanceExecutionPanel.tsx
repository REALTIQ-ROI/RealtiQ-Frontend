import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { hasAdminCapability } from '../../services/adminAccessService';
import { financeExecutionService, type EscrowRefundExecution, type ProxyRefundExecution, type ProxySettlementExecution } from '../../services/financeExecutionService';
import { formatMoneyMinor } from '../../utils/moneyMinor';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

type Kind = 'escrow_refund' | 'proxy_settlement' | 'proxy_refund';
type Execution = EscrowRefundExecution | ProxySettlementExecution | ProxyRefundExecution;
const errorMessage = (raw: unknown) => raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})${raw.requestId ? ` · Request ${raw.requestId}` : ''}` : raw instanceof Error ? raw.message : 'Execution status could not be loaded.';
const isProxyRefund = (value: Execution): value is ProxyRefundExecution => !('beneficiaries' in value);

const FinanceExecutionPanel = ({ kind, resourceId }: { kind: Kind; resourceId: string }) => {
  const { activeProfile, adminAccess } = useAuth();
  const profileId = activeProfile?.id;
  const canRead = hasAdminCapability(adminAccess, 'finance.read');
  const canManage = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'finance.manage'));
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [missing, setMissing] = useState(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const requestVersion = useRef(0);
  const submitted = useRef(false);
  const stepUp = useBoundStepUp<unknown>();
  const title = kind === 'escrow_refund' ? 'Finance refund execution' : kind === 'proxy_settlement' ? 'Inspection settlement' : 'Inspection refund execution';

  const refresh = useCallback(async () => {
    if (!profileId || !canRead || !resourceId) return;
    const request = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = kind === 'escrow_refund' ? await financeExecutionService.getEscrowRefund(resourceId) : kind === 'proxy_settlement' ? await financeExecutionService.getProxySettlement(resourceId) : await financeExecutionService.getProxyRefund(resourceId);
      if (request !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setExecution(result); setMissing(false); setMustRefresh(false);
      setBeneficiaryId(''); setAuthorizationCode('');
    } catch (raw) {
      if (request !== requestVersion.current) return;
      if (raw instanceof ApiRequestError && raw.status === 404) { setExecution(null); setMissing(true); setMustRefresh(false); }
      else setError(errorMessage(raw));
    } finally { if (request === requestVersion.current) setLoading(false); }
  }, [canRead, kind, profileId, resourceId]);

  useEffect(() => {
    const request = requestVersion.current;
    queueMicrotask(() => { if (request === requestVersion.current) void refresh(); });
    return () => { requestVersion.current += 1; stepUp.cancel(); };
    // Parent keys this panel by execution resource and selected staff profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, resourceId, profileId]);

  const beginReconcile = async () => {
    if (!execution || !canManage || !execution.actionEligibility.reconcile || mustRefresh || loading || stepUp.busy || stepUp.challenge) return;
    const path = kind === 'escrow_refund' ? `/api/admin/escrows/${encodeURIComponent(resourceId)}/refund-execution/reconcile` : kind === 'proxy_settlement' ? `/api/admin/proxy-inspections/${encodeURIComponent(resourceId)}/settlement/reconcile` : `/api/admin/proxy-inspections/${encodeURIComponent(resourceId)}/refund-execution/reconcile`;
    submitted.current = false;
    await stepUp.begin({ method: 'POST', path, body: {}, label: `Reconcile ${title.toLowerCase()}`, execute: async (challengeId) => {
      submitted.current = true;
      return kind === 'escrow_refund' ? financeExecutionService.reconcileEscrowRefund(resourceId, challengeId) : kind === 'proxy_settlement' ? financeExecutionService.reconcileProxySettlement(resourceId, challengeId) : financeExecutionService.reconcileProxyRefund(resourceId, challengeId);
    } });
  };

  const beginAuthorize = async () => {
    if (!execution || !canManage || mustRefresh || loading || stepUp.busy || stepUp.challenge) return;
    const trimmed = authorizationCode.trim();
    if (!/^\d{4,10}$/.test(trimmed)) { setError('Enter the 4 to 10 digit provider authorization code.'); return; }
    let path: string;
    if (kind === 'proxy_refund' && isProxyRefund(execution)) {
      if (!execution.actionEligibility.authorizeTransfer || execution.state !== 'pending_authorization') return;
      path = `/api/admin/proxy-inspections/${encodeURIComponent(resourceId)}/refund-execution/authorize-transfer`;
    } else if (!isProxyRefund(execution)) {
      if (!execution.actionEligibility.authorizeTransferBeneficiaryIds.includes(beneficiaryId) || !execution.beneficiaries.some((item) => item.id === beneficiaryId && item.state === 'pending_authorization')) return;
      path = kind === 'escrow_refund' ? `/api/admin/escrows/${encodeURIComponent(resourceId)}/refund-execution/beneficiaries/${encodeURIComponent(beneficiaryId)}/authorize-transfer` : `/api/admin/proxy-inspections/${encodeURIComponent(resourceId)}/settlement/beneficiaries/${encodeURIComponent(beneficiaryId)}/authorize-transfer`;
    } else return;
    const body = { authorizationCode: trimmed };
    submitted.current = false;
    const started = await stepUp.begin({ method: 'POST', path, body, label: `Authorize ${title.toLowerCase()} transfer`, execute: async (challengeId, exactBody) => {
      submitted.current = true;
      return kind === 'escrow_refund' ? financeExecutionService.authorizeEscrowRefund(resourceId, beneficiaryId, exactBody, challengeId) : kind === 'proxy_settlement' ? financeExecutionService.authorizeProxySettlement(resourceId, beneficiaryId, exactBody, challengeId) : financeExecutionService.authorizeProxyRefund(resourceId, exactBody, challengeId);
    } });
    if (started) setAuthorizationCode('');
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      if (submitted.current) { setMustRefresh(true); await refresh(); }
      setError(result.error ?? 'The provider action was not confirmed. Refresh the execution state.');
      return false;
    }
    setMustRefresh(true);
    setNotice('The server accepted the action. The latest execution state is shown below; only completed state confirms transfer or refund completion.');
    await refresh();
    return true;
  };

  if (!canRead) return null;
  const beneficiaries = execution && !isProxyRefund(execution) ? execution.beneficiaries : [];
  const eligibleIds = execution && !isProxyRefund(execution) ? execution.actionEligibility.authorizeTransferBeneficiaryIds : [];
  const canAuthorize = execution && isProxyRefund(execution) ? execution.actionEligibility.authorizeTransfer && execution.state === 'pending_authorization' : eligibleIds.length > 0;
  return <section className="mt-6 rounded-xl border bg-white p-5" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{title}</h2><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh state</Button></div>
    <p className="mt-1 text-sm text-secondary">Provider transfers are confirmed per recipient. Pending, unknown and failed states require Finance review of the same reference.</p>
    {loading ? <p role="status" className="mt-2 text-sm">Loading execution state…</p> : null}{error ? <p role="alert" className="mt-2 text-sm text-error">{error}</p> : null}{notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    {mustRefresh ? <p role="alert" className="mt-2 text-sm">The last action may have reached the provider. Refresh this execution before another action.</p> : null}
    {missing && !loading ? <p className="mt-2 text-sm text-secondary">No execution record was found for this {kind === 'escrow_refund' ? 'escrow' : 'inspection'}.</p> : null}
    {execution ? <><p className="mt-3 text-sm"><strong>{execution.state.replaceAll('_', ' ')}</strong> · Version {execution.version}{execution.state === 'completed' ? ' · Provider-confirmed completion' : ' · Completion not confirmed'}</p>
      {kind === 'escrow_refund' && 'buyerReturnMinor' in execution ? <p className="mt-2 text-sm">Buyer return {formatMoneyMinor(execution.buyerReturnMinor, execution.currency)} · Seller recovery {formatMoneyMinor(execution.sellerRecoveryMinor, execution.currency)} · Fault {execution.faultParty.replaceAll('_', ' ')}</p> : null}
      {kind === 'proxy_settlement' && 'inspectorPayoutMinor' in execution ? <p className="mt-2 text-sm">Inspection Partner payout {formatMoneyMinor(execution.inspectorPayoutMinor, execution.currency)} · REALTIQ fee {formatMoneyMinor(execution.realtiqFeeMinor, execution.currency)}</p> : null}
      {kind === 'proxy_refund' && isProxyRefund(execution) ? <p className="mt-2 text-sm">Payer refund {formatMoneyMinor(execution.amountMinor, execution.currency)} · {execution.destinationBankName ?? 'Bank not returned'} · {execution.destinationMasked ?? 'Masked destination unavailable'}{execution.transferReference ? ` · Reference ${execution.transferReference}` : ''}</p> : null}
      {isProxyRefund(execution) ? <p className="mt-1 text-sm">Provider state: {execution.providerCode ?? 'not returned'} · Attempts: {execution.attemptCount}{execution.cancelAfterRefund ? ' · Cancel the inspection only after the refund completes' : ''}</p> : null}
      {'lastFailureCode' in execution && execution.lastFailureCode ? <p className="mt-2 text-sm text-error">Latest hold: {execution.lastFailureCode}</p> : null}
      {beneficiaries.length ? <ul className="mt-3 space-y-2">{beneficiaries.map((item) => <li key={item.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{item.role}</strong> · {formatMoneyMinor(item.amountMinor, item.currency)} · {item.state.replaceAll('_', ' ')}<p>{item.destinationBankName ?? 'Bank not returned'} · {item.destinationMasked ?? 'Masked destination unavailable'}{item.transferReference ? ` · Reference ${item.transferReference}` : ''}</p></li>)}</ul> : null}
      {canManage ? <div className="mt-4 space-y-3">{execution.actionEligibility.reconcile ? <Button type="button" variant="secondary" disabled={mustRefresh || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile()}>Reconcile with authenticator</Button> : null}
        {canAuthorize ? <div className="flex flex-wrap items-end gap-2">{eligibleIds.length ? <label className="text-sm">Transfer awaiting authorization<select className="mt-1 block rounded-lg border p-2" value={beneficiaryId} onChange={(event) => { setBeneficiaryId(event.target.value); setAuthorizationCode(''); }}><option value="">Choose transfer</option>{beneficiaries.filter((item) => eligibleIds.includes(item.id) && item.state === 'pending_authorization').map((item) => <option key={item.id} value={item.id}>{item.role} · {formatMoneyMinor(item.amountMinor, item.currency)} · {item.destinationMasked ?? 'masked destination unavailable'}</option>)}</select></label> : null}<label className="text-sm">Provider authorization code<input className="mt-1 block rounded-lg border p-2" type="password" inputMode="numeric" autoComplete="off" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} /></label><Button type="button" disabled={(!isProxyRefund(execution) && !beneficiaryId) || !/^\d{4,10}$/.test(authorizationCode.trim()) || mustRefresh || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginAuthorize()}>Authorize transfer with authenticator</Button></div> : null}</div> : null}
    </> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { stepUp.cancel(); setAuthorizationCode(''); }} onSubmit={complete} />
  </section>;
};

export default FinanceExecutionPanel;
