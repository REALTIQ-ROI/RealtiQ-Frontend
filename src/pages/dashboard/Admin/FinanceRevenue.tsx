import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { hasAdminCapability } from '../../../services/adminAccessService';
import { financeRevenueService, type ProductRefund, type ProviderSettlementLine, type RevenueFeeLine, type RevenueRange, type RevenueReport } from '../../../services/financeRevenueService';
import { formatMoneyMinor } from '../../../utils/moneyMinor';
import ProviderSettlementEvents from '../../../components/billing/ProviderSettlementEvents';

const errorText = (error: unknown) => error instanceof ApiRequestError && error.code ? `${error.message} (${error.code})${error.requestId ? ` · Request ${error.requestId}` : ''}` : error instanceof Error ? error.message : 'The Finance request could not be completed.';
type FinanceAction = { kind: 'decision'; result: { refund?: ProductRefund; refunds?: ProductRefund[]; decision?: string } } | { kind: 'refund-reconcile'; result: { checked: number; completed: number; pending: number; held: number } } | { kind: 'document-reconcile'; result: { checked: number; issued: number; held: number } };

const FinanceRevenue = () => {
  const navigate = useNavigate();
  const { activeProfile, adminAccess } = useAuth();
  const canRead = hasAdminCapability(adminAccess, 'finance.read');
  const canManage = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'finance.manage'));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [reconciliation, setReconciliation] = useState<Awaited<ReturnType<typeof financeRevenueService.getReconciliation>> | null>(null);
  const [feeLines, setFeeLines] = useState<RevenueFeeLine[]>([]);
  const [feeCursor, setFeeCursor] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<ProviderSettlementLine[]>([]);
  const [settlementCursor, setSettlementCursor] = useState<string | null>(null);
  const [settlementScope, setSettlementScope] = useState('');
  const [loadedRange, setLoadedRange] = useState<RevenueRange | null>(null);
  const [refunds, setRefunds] = useState<ProductRefund[]>([]);
  const [refundCursor, setRefundCursor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [inspectionRequestId, setInspectionRequestId] = useState('');
  const [inspectionLookupError, setInspectionLookupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestVersion = useRef(0);
  const stepUp = useBoundStepUp<FinanceAction>();
  const profileId = activeProfile?.id;

  const loadRefunds = useCallback(async () => {
    if (!profileId || !canRead) return;
    const version = ++requestVersion.current;
    try {
      const page = await financeRevenueService.listProductRefunds({ limit: 25 });
      if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setRefunds(page.refunds); setRefundCursor(page.nextCursor);
    } catch (raw) { if (version === requestVersion.current) setError(errorText(raw)); }
  }, [canRead, profileId]);

  useEffect(() => {
    requestVersion.current += 1; setReport(null); setReconciliation(null); setFeeLines([]); setFeeCursor(null); setSettlements([]); setSettlementCursor(null); setSettlementScope(''); setLoadedRange(null); setRefunds([]); setRefundCursor(null); setError(''); setNotice('');
    void loadRefunds();
    return () => { requestVersion.current += 1; };
  }, [profileId, loadRefunds]);

  const range = () => {
    const start = Date.parse(from);
    const end = Date.parse(to);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 366 * 24 * 60 * 60 * 1000) { setError('Choose a valid start and end within 366 days.'); return null; }
    return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
  };

  const loadReport = async () => {
    const selectedRange = range();
    if (!selectedRange || !profileId || !canRead) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    setReport(null); setReconciliation(null); setFeeLines([]); setFeeCursor(null); setSettlements([]); setSettlementCursor(null); setSettlementScope(''); setLoadedRange(null);
    const results = await Promise.allSettled([
      financeRevenueService.getReport(selectedRange),
      financeRevenueService.getReconciliation(selectedRange),
      financeRevenueService.getFeeLines({ ...selectedRange, limit: 50 }),
      financeRevenueService.getProviderSettlementLines({ ...selectedRange, limit: 50 }),
    ]);
    if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
    const [reportResult, reconciliationResult, lineResult, settlementResult] = results;
    setLoadedRange(selectedRange);
    if (reportResult.status === 'fulfilled') setReport(reportResult.value);
    if (reconciliationResult.status === 'fulfilled') setReconciliation(reconciliationResult.value);
    if (lineResult.status === 'fulfilled') { setFeeLines(lineResult.value.feeLines); setFeeCursor(lineResult.value.nextCursor); }
    if (settlementResult.status === 'fulfilled') { setSettlements(settlementResult.value.settlements); setSettlementCursor(settlementResult.value.nextCursor); setSettlementScope(settlementResult.value.reconciliationScope); }
    setError(results.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map((result) => errorText(result.reason)).join(' '));
    setLoading(false);
  };

  const loadMore = async (kind: 'fees' | 'refunds' | 'settlements') => {
    if (!profileId || !canRead || loading) return;
    const version = requestVersion.current;
    setLoading(true); setError('');
    try {
      if (kind === 'fees') {
        if (!feeCursor || !loadedRange) return;
        const page = await financeRevenueService.getFeeLines({ ...loadedRange, limit: 50, after: feeCursor });
        if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setFeeLines((current) => [...current, ...page.feeLines.filter((item) => !current.some((old) => old.id === item.id))]); setFeeCursor(page.nextCursor); }
      } else if (kind === 'settlements') {
        if (!settlementCursor || !loadedRange) return;
        const page = await financeRevenueService.getProviderSettlementLines({ ...loadedRange, limit: 50, before: settlementCursor });
        if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setSettlements((current) => [...current, ...page.settlements.filter((item) => !current.some((old) => old.id === item.id))]); setSettlementCursor(page.nextCursor); setSettlementScope(page.reconciliationScope); }
      } else {
        if (!refundCursor) return;
        const page = await financeRevenueService.listProductRefunds({ limit: 25, after: refundCursor });
        if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setRefunds((current) => [...current, ...page.refunds.filter((item) => !current.some((old) => old.id === item.id))]); setRefundCursor(page.nextCursor); }
      }
    } catch (raw) { if (version === requestVersion.current) setError(errorText(raw)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  };

  const beginDecision = async (refund: ProductRefund, decision: 'approve' | 'reject') => {
    const trimmed = reason.trim();
    if (!canManage || !trimmed || trimmed.length > 500 || stepUp.busy || stepUp.challenge) { setError('Enter a reason of 1 to 500 characters before deciding.'); return; }
    const body = { decision, reason: trimmed, expectedVersion: refund.version };
    await stepUp.begin({ method: 'POST', path: `/api/admin/revenue/product-refunds/${encodeURIComponent(refund.id)}/decision`, body, label: `${decision} product refund`, execute: async (challengeId, exactBody) => ({ kind: 'decision', result: await financeRevenueService.decideProductRefund(refund.id, exactBody, challengeId) }) });
  };
  const beginReconcile = async (kind: 'refund' | 'document') => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    const path = kind === 'refund' ? '/api/admin/revenue/product-refunds/reconcile' : '/api/admin/revenue/documents/reconcile';
    await stepUp.begin({ method: 'POST', path, body: {}, label: kind === 'refund' ? 'Reconcile existing product refunds' : 'Reconcile revenue document issuance', execute: async (challengeId) => kind === 'refund' ? { kind: 'refund-reconcile', result: await financeRevenueService.reconcileProductRefunds({}, challengeId) } : { kind: 'document-reconcile', result: await financeRevenueService.reconcileRevenueDocuments({}, challengeId) } });
  };
  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The protected Finance operation was not confirmed.'); return false; }
    if (result.value.kind === 'decision') setNotice('The server returned a refund decision. Refresh the refund queue to check provider and credit-note state.');
    if (result.value.kind === 'refund-reconcile') setNotice(`Refund reconciliation checked ${result.value.result.checked}; ${result.value.result.completed} completed, ${result.value.result.pending} pending, ${result.value.result.held} held.`);
    if (result.value.kind === 'document-reconcile') setNotice(`Document issuance checked ${result.value.result.checked}; ${result.value.result.issued} issued, ${result.value.result.held} held.`);
    setReason(''); await loadRefunds();
    return true;
  };

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><header><h1 className="text-3xl font-black">Finance revenue</h1><p className="mt-2 text-sm text-secondary">Server-reported fee income, adjustments and merchant settlement status. These figures do not prove beneficiary split settlement.</p></header>
    {!canRead ? <p role="alert">Your current staff profile does not grant Finance reads.</p> : <>
      <section className="rounded-xl border bg-white p-5" aria-labelledby="range-heading"><h2 id="range-heading" className="text-xl font-bold">Reporting period</h2><div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm">From<input className="mt-1 block rounded border p-2" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="text-sm">To<input className="mt-1 block rounded border p-2" type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} /></label><Button type="button" disabled={loading} onClick={() => void loadReport()}>Load report</Button></div></section>
      {loading ? <p role="status">Loading Finance records…</p> : null}{error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p> : null}{notice ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm">{notice}</p> : null}
      {report ? <section className="rounded-xl border bg-white p-5" aria-labelledby="earned-heading"><h2 id="earned-heading" className="text-xl font-bold">Recognized fee income</h2><p className="mt-2 text-sm text-secondary">Adjustment coverage: {report.adjustmentCoverage}. Provider settlement: {report.providerSettlementReconciliation}.</p>{report.earned.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">Period / fee</th><th scope="col" className="p-2">Charged gross</th><th scope="col" className="p-2">Adjustments</th><th scope="col" className="p-2">After adjustments</th></tr></thead><tbody>{report.earned.map((row, index) => <tr key={`${row._id.feeCode}:${row._id.currency}:${row._id.year}:${row._id.month}:${index}`} className="border-t"><td className="p-2">{row._id.year}-{String(row._id.month).padStart(2, '0')} · {row._id.feeCode} · {row._id.state}</td><td className="p-2">{formatMoneyMinor(row.chargedGrossMinor, row._id.currency)}</td><td className="p-2">{formatMoneyMinor(row.refundedOrCreditedGrossMinor, row._id.currency)}</td><td className="p-2">{formatMoneyMinor(row.grossAfterAdjustmentsMinor, row._id.currency)}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-secondary">No earned fee rows in this period.</p>}<h3 className="mt-5 font-bold">Seller fee recovery receivables</h3>{report.receivables.defaultingSellerFeeRecoveries.length ? report.receivables.defaultingSellerFeeRecoveries.map((row, index) => <p key={index} className="text-sm">{row._id.currency} · {row._id.state}: {formatMoneyMinor(row.outstandingMinor, row._id.currency)} outstanding</p>) : <p className="text-sm text-secondary">No recovery receivables returned.</p>}</section> : null}
      {reconciliation ? <section className="rounded-xl border bg-white p-5" aria-labelledby="reconciliation-heading"><h2 id="reconciliation-heading" className="text-xl font-bold">Reconciliation</h2><p className="mt-2 text-sm">Payments missing fee lines: {reconciliation.paymentsMissingFeeLines}. Provider settlement: {reconciliation.providerSettlementReconciliation}.</p>{reconciliation.feeLines.map((row, index) => <p key={index} className="mt-2 text-sm">{row.currency} · {row.status} · settlement {row.settlementStatus}: {row.count} lines, {formatMoneyMinor(row.grossMinor, row.currency)} gross</p>)}</section> : null}
      {report ? <section className="rounded-xl border bg-white p-5" aria-labelledby="fee-lines-heading"><h2 id="fee-lines-heading" className="text-xl font-bold">Fee lines</h2><p className="mt-1 text-sm text-secondary">These are paged records. Report totals above come from the server aggregate.</p>{feeLines.map((line) => <p key={line.id} className="mt-2 rounded-lg bg-surface-container-low p-3 text-sm">{line.feeCode} · {formatMoneyMinor(line.grossMinor, line.currency)} · {line.status} · settlement {line.settlementStatus} · collected {line.collected === true ? 'Yes' : line.collected === false ? 'No' : 'Not returned'}</p>)}{!feeLines.length ? <p className="mt-2 text-sm text-secondary">No fee lines returned.</p> : null}{feeCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loading} onClick={() => void loadMore('fees')}>Load more fee lines</Button> : null}</section> : null}
      {loadedRange ? <section className="rounded-xl border bg-white p-5" aria-labelledby="provider-settlement-heading"><h2 id="provider-settlement-heading" className="text-xl font-bold">Merchant settlement evidence</h2><p className="mt-1 text-sm text-secondary">{settlementScope || 'Scope not returned'}. These records do not confirm split beneficiary transfers.</p>{settlements.length ? <ul className="mt-3 space-y-2">{settlements.map((line) => <li key={line.id} className="rounded-lg bg-surface-container-low p-3 text-sm">Payment {line.paymentReference} · Settlement {line.settlementReference}<p>{formatMoneyMinor(line.grossMinor, line.currency)} gross · {formatMoneyMinor(line.settlementMinor, line.currency)} merchant settlement · {formatMoneyMinor(line.providerChargesMinor, line.currency)} provider charges</p></li>)}</ul> : <p className="mt-3 text-sm text-secondary">No matched merchant settlement lines returned.</p>}{settlementCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loading} onClick={() => void loadMore('settlements')}>Load more settlement lines</Button> : null}</section> : null}
      {loadedRange ? <ProviderSettlementEvents key={`${profileId}:${loadedRange.from}:${loadedRange.to}`} range={loadedRange} canManage={canManage} /> : null}
      <section className="rounded-xl border bg-white p-5" aria-labelledby="inspection-finance-heading"><h2 id="inspection-finance-heading" className="text-xl font-bold">Inspection settlement or refund</h2><p className="mt-1 text-sm text-secondary">Open a known inspection request to review its current masked transfer and refund records. The backend has not supplied a Finance inspection directory.</p><form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const id = inspectionRequestId.trim(); if (!/^[0-9a-f]{24}$/i.test(id)) { setInspectionLookupError('Enter the inspection request ID from the authorized case record.'); return; } setInspectionLookupError(''); void navigate(`/dashboard/admin/finance/proxy-inspections/${id}`); }}><label className="text-sm">Inspection request ID<input className="mt-1 block w-full rounded border p-2" value={inspectionRequestId} onChange={(event) => { setInspectionRequestId(event.target.value); setInspectionLookupError(''); }} /></label><Button type="submit">Open Finance execution</Button></form>{inspectionLookupError ? <p role="alert" className="mt-2 text-sm text-error">{inspectionLookupError}</p> : null}</section>
      <section className="rounded-xl border bg-white p-5" aria-labelledby="refunds-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="refunds-heading" className="text-xl font-bold">Product refunds</h2><Button type="button" variant="secondary" onClick={() => void loadRefunds()}>Refresh queue</Button></div><p className="mt-1 text-sm text-secondary">Only server-created campaign-budget and eligible undelivered title-document refunds are handled here. A credit note appears only after provider confirmation.</p>{refunds.map((refund) => <article key={refund.id} className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm"><strong>{refund.productKind.replaceAll('_', ' ')}</strong> · {refund.state.replaceAll('_', ' ')} · {formatMoneyMinor(refund.refundAmountMinor, refund.currency)}<p>Provider: {refund.providerStatus ?? 'Not returned'} · Credit note: {refund.creditNoteId ? 'Issued' : 'Not issued'}</p>{canManage && refund.state === 'pending_approval' ? <div className="mt-2 flex flex-wrap gap-2"><Button type="button" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginDecision(refund, 'approve')}>Approve with authenticator</Button><Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginDecision(refund, 'reject')}>Reject with authenticator</Button></div> : null}</article>)}{!refunds.length ? <p className="mt-3 text-sm text-secondary">No refund rows returned.</p> : null}{refundCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loading} onClick={() => void loadMore('refunds')}>Load more refunds</Button> : null}{canManage ? <><label className="mt-4 block text-sm">Decision reason (required)<textarea className="mt-1 block w-full rounded-lg border p-2" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="mt-3 flex gap-2"><Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile('refund')}>Reconcile existing refunds</Button><Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile('document')}>Reconcile document issuance</Button></div></> : null}</section>
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
    </>}
  </main></AdminLayout>;
};

export default FinanceRevenue;
