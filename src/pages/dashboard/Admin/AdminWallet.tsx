import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { normalizeProxyPricing } from '../../../features/proxyNetwork/pricing';
import { adminService, type WalletTransactionFilters } from '../../../services/adminService';
import type { WalletSummary, WalletTransactionStatus, WalletTransactionType } from '../../../types';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const toIsoBoundary = (value: string, end = false): string | undefined => {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const transactionTypeLabel = (type: WalletTransactionType) => ({
  proxy_inspection_commission: 'Proxy Inspector Commission',
  proxy_inspection_buyer_fee: 'Buyer Platform & Protection Fee',
  title_document_view: 'Title document view',
  tour_payment: 'Tour payment',
  platform_fee: 'Platform fee',
  other: 'Other',
}[type] || type.replaceAll('_', ' '));

const AdminWallet = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof adminService.listWalletTransactions>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState(searchParams.get('reference') ?? '');

  const filters = useMemo<WalletTransactionFilters>(() => ({
    page: Number(searchParams.get('page') || 1),
    limit: Number(searchParams.get('limit') || 25),
    type: (searchParams.get('type') || undefined) as WalletTransactionType | undefined,
    status: (searchParams.get('status') || undefined) as WalletTransactionStatus | undefined,
    from: toIsoBoundary(searchParams.get('from') ?? ''),
    to: toIsoBoundary(searchParams.get('to') ?? '', true),
    property: searchParams.get('property') || undefined,
    user: searchParams.get('user') || undefined,
    reference: searchParams.get('reference') || undefined,
    paymentStatus: searchParams.get('paymentStatus') || undefined,
    inspector: searchParams.get('inspector') || undefined,
    inspectionRequest: searchParams.get('inspectionRequest') || undefined,
  }), [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallet, ledger] = await Promise.all([
        adminService.getWalletSummary(),
        adminService.listWalletTransactions(filters),
      ]);
      setSummary(wallet);
      setTransactions(ledger);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load the RealtIQ platform ledger.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get('reference') ?? '';
      if (current === reference.trim()) return;
      const next = new URLSearchParams(searchParams);
      if (reference.trim()) next.set('reference', reference.trim());
      else next.delete('reference');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [reference, searchParams, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const cards = summary ? [
    ['Total credits', summary.totalCredits],
    ['Total debits / refunds', summary.totalDebits],
    ['Net revenue', summary.netRevenue],
    ['Available revenue', summary.availableRevenue],
    ['Title-document views', summary.breakdown.titleDocumentViews],
    ['Tour payments', summary.breakdown.tourPayments],
    ['Property Agent revenue', summary.breakdown.proxyInspectionRevenue ?? 0],
    ['Other platform revenue', summary.breakdown.other],
    ['Refunds', summary.breakdown.refunds],
  ] as const : [];

  return (
    <AdminLayout>
      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:px-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">RealtIQ platform ledger</p>
          <h1 className="mt-1 text-3xl font-extrabold">Platform revenue</h1>
          <p className="mt-2 text-sm text-secondary">Internal accounting records, not a Paystack bank balance. Credits, refunds, and reversals remain as separate audit entries.</p>
        </div>
        {loading && !summary ? <div className="mt-8"><LoadingState label="Loading platform ledger…" /></div> : null}
        {error ? <div className="mt-8"><ErrorState message={error} onRetry={() => void load()} /></div> : null}
        {summary ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, amount]) => (
                <div key={label} className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{label}</p>
                  <p className="mt-2 text-2xl font-black">{formatNaira(amount)}</p>
                </div>
              ))}
              <div className="rounded-xl bg-primary p-5 text-on-primary">
                <p className="text-xs font-bold uppercase tracking-widest text-on-primary/70">Transaction count</p>
                <p className="mt-2 text-2xl font-black">{summary.transactionCount.toLocaleString()}</p>
              </div>
            </div>

            <section className="mt-8 rounded-xl bg-white p-5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select aria-label="Transaction type" value={searchParams.get('type') ?? ''} onChange={(event) => updateFilter('type', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm">
                  <option value="">All types</option>
                  <option value="title_document_view">Title document view</option>
                  <option value="tour_payment">Tour payment</option>
                  <option value="platform_fee">Platform fee</option>
                  <option value="proxy_inspection_commission">Proxy Inspector Commission</option>
                  <option value="proxy_inspection_buyer_fee">Buyer Platform & Protection Fee</option>
                  <option value="other">Other</option>
                </select>
                <select aria-label="Transaction status" value={searchParams.get('status') ?? ''} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm">
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="reversed">Reversed</option>
                  <option value="refunded">Refunded</option>
                </select>
                <input aria-label="Date from" type="date" value={searchParams.get('from') ?? ''} onChange={(event) => updateFilter('from', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Date to" type="date" value={searchParams.get('to') ?? ''} onChange={(event) => updateFilter('to', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Property filter" placeholder="Property ID/reference" value={searchParams.get('property') ?? ''} onChange={(event) => updateFilter('property', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="User filter" placeholder="User ID" value={searchParams.get('user') ?? ''} onChange={(event) => updateFilter('user', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Exact payment reference" placeholder="Exact payment reference" value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Payment status" placeholder="Payment status" value={searchParams.get('paymentStatus') ?? ''} onChange={(event) => updateFilter('paymentStatus', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Inspector filter" placeholder="Inspector user ID" value={searchParams.get('inspector') ?? ''} onChange={(event) => updateFilter('inspector', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
                <input aria-label="Inspection request filter" placeholder="Inspection request ID" value={searchParams.get('inspectionRequest') ?? ''} onChange={(event) => updateFilter('inspectionRequest', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" />
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-widest text-secondary">
                    <tr><th className="p-3">Created</th><th className="p-3">Type</th><th className="p-3">Direction</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Reference</th><th className="p-3">Property / document</th><th className="p-3">Viewer</th><th className="p-3">Description</th></tr>
                  </thead>
                  <tbody>
                    {transactions?.transactions.map((transaction) => {
                      const pricing = transaction.serviceEscrow ? normalizeProxyPricing(transaction.serviceEscrow) : null;
                      return (
                      <tr key={transaction._id} className="border-b border-outline-variant/10 align-top">
                        <td className="p-3 whitespace-nowrap">{new Date(transaction.createdAt).toLocaleString('en-NG')}</td>
                        <td className="p-3">{transactionTypeLabel(transaction.type)}</td>
                        <td className={`p-3 font-bold ${transaction.direction === 'credit' ? 'text-emerald-700' : 'text-red-700'}`}>{transaction.direction}</td>
                        <td className="p-3 font-bold">{formatNaira(transaction.amount)}</td>
                        <td className="p-3 capitalize">{transaction.status}</td>
                        <td className="p-3 font-mono text-xs">{transaction.paymentReference || '—'}</td>
                        <td className="p-3"><p>{transaction.property?.title || (transaction.inspectionRequest ? `Property Agent job · ${transaction.inspectionRequest.status || 'job'}` : '—')}</p><p className="text-xs text-secondary">{transaction.document?.title || transaction.property?.publicReference || (transaction.inspectionRequest?.agreedPrice ? formatNaira(transaction.inspectionRequest.agreedPrice) : '')}</p>{pricing ? <dl className="mt-2 grid gap-1 text-xs text-secondary"><div><dt className="inline font-bold">Agreed:</dt> <dd className="inline">{formatNaira(pricing.agreedPrice ?? 0)}</dd></div><div><dt className="inline font-bold">Buyer fee:</dt> <dd className="inline">{formatNaira(pricing.buyerFeeAmount)}</dd></div><div><dt className="inline font-bold">Buyer total:</dt> <dd className="inline">{formatNaira(pricing.buyerTotalAmount ?? 0)}</dd></div><div><dt className="inline font-bold">Inspector commission:</dt> <dd className="inline">{formatNaira(pricing.inspectorCommissionAmount ?? 0)}</dd></div><div><dt className="inline font-bold">Inspector payout:</dt> <dd className="inline">{formatNaira(pricing.inspectorPayoutAmount ?? 0)}</dd></div><div><dt className="inline font-bold">RealtIQ revenue:</dt> <dd className="inline">{formatNaira(pricing.totalPlatformRevenue ?? 0)}</dd></div><div><dt className="inline font-bold">Escrow:</dt> <dd className="inline capitalize">{transaction.serviceEscrow?.status || 'unknown'}</dd></div></dl> : null}</td>
                        <td className="p-3">{transaction.user?.name || 'Guest'}{transaction.provider ? <p className="text-xs text-secondary">Inspector: {transaction.provider.name}</p> : null}</td>
                        <td className="p-3">{transaction.description || '—'}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
                {transactions?.transactions.length === 0 ? <p className="p-8 text-center text-sm text-secondary">No ledger entries match these filters.</p> : null}
              </div>
              {transactions ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-secondary">Page {transactions.page} • {transactions.total.toLocaleString()} entries</p>
                  <div className="flex items-center gap-2">
                    <select aria-label="Page size" value={String(transactions.limit)} onChange={(event) => updateFilter('limit', event.target.value)} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs">
                      <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
                    </select>
                    <button type="button" disabled={transactions.page <= 1} onClick={() => updateFilter('page', String(transactions.page - 1))} className="rounded-lg bg-surface-container-low px-4 py-2 text-xs font-bold disabled:opacity-50">Previous</button>
                    <button type="button" disabled={transactions.page * transactions.limit >= transactions.total} onClick={() => updateFilter('page', String(transactions.page + 1))} className="rounded-lg bg-surface-container-low px-4 py-2 text-xs font-bold disabled:opacity-50">Next</button>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </AdminLayout>
  );
};

export default AdminWallet;
