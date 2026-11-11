import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fxAgreementService, type FxAgreement } from '../../services/fxAgreementService';
import { formatMoneyMinor } from '../../utils/moneyMinor';

const isCurrentConfirmed = (agreement: FxAgreement) =>
  agreement.status === 'confirmed' && !agreement.consumedAt && Date.parse(agreement.expiresAt) > Date.now();

/** A buyer and seller agree on an NGN amount; the server derives the rate. */
type FxPanelProps = ({ propertyId: string; installment?: never } | { propertyId?: never; installment: { id: string; scheduleItemId: string; listedAmountMinor: number } }) & { onSelect: (id: string | null) => void };

const PropertyFxAgreement = ({ propertyId, installment, onSelect }: FxPanelProps) => {
  const { user, activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const resourceKey = installment?.id ?? propertyId;
  const scheduleItemId = installment?.scheduleItemId;
  const [agreements, setAgreements] = useState<FxAgreement[]>([]);
  const [amountNgn, setAmountNgn] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestVersion = useRef(0);
  const operationKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId || !resourceKey) { setAgreements([]); onSelect(null); return; }
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = await fxAgreementService.list(installment ? { installmentId: installment.id, limit: 50 } : { propertyId: propertyId!, limit: 50 });
      if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setAgreements(result);
      const matches = (agreement: FxAgreement) => agreement.buyerProfileId === profileId && isCurrentConfirmed(agreement) &&
        (installment ? agreement.installmentId === installment.id && agreement.scheduleItemId === scheduleItemId : !agreement.installmentId);
      const current = result.find((agreement) => agreement.id === selectedId && matches(agreement)) ?? result.find(matches);
      setSelectedId(current?.id ?? '');
      onSelect(current?.id ?? null);
    } catch (raw) {
      if (version === requestVersion.current) { setAgreements([]); setSelectedId(''); onSelect(null); setError(raw instanceof Error ? raw.message : 'Unable to load FX agreements.'); }
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [profileId, resourceKey, propertyId, installment, scheduleItemId, selectedId, onSelect]);

  useEffect(() => {
    setAgreements([]); setSelectedId(''); setAmountNgn(''); setNotice(''); setError(''); operationKey.current = null; onSelect(null);
    void refresh();
    return () => { requestVersion.current += 1; };
    // The profile and resource define a new agreement scope; refresh is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, resourceKey, scheduleItemId]);

  const propose = async () => {
    const amount = Number(amountNgn);
    if (!profileId || !/^[1-9]\d*$/.test(amountNgn) || !Number.isSafeInteger(amount * 100)) {
      setError('Enter the agreed positive whole NGN amount.'); return;
    }
    if (installment && (!installment.scheduleItemId || !Number.isSafeInteger(installment.listedAmountMinor) || installment.listedAmountMinor <= 0)) {
      setError('The current USD installment amount or schedule item is unavailable. Refresh the plan.'); return;
    }
    if (busy || !window.confirm('Propose this NGN amount to the seller? The seller must confirm it before payment.')) return;
    operationKey.current ??= `fx_${crypto.randomUUID()}`;
    setBusy(true); setError(''); setNotice('');
    try {
      const body = installment
        ? { installmentId: installment.id, scheduleItemId: installment.scheduleItemId, listedAmountMinor: installment.listedAmountMinor, payableAmountMinor: amount * 100, operationKey: operationKey.current }
        : { propertyId: propertyId!, payableAmountMinor: amount * 100, operationKey: operationKey.current };
      const result = await fxAgreementService.propose(body);
      setNotice(`Proposal ${result.agreement.status.replaceAll('_', ' ')}. The seller must confirm the current terms before payment.`);
      await refresh();
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'The proposal could not be confirmed. Refresh before retrying with the same proposal.'); }
    finally { setBusy(false); }
  };

  const confirm = async (agreement: FxAgreement) => {
    if (busy || !window.confirm(`Confirm the server-returned NGN amount ${formatMoneyMinor(agreement.payableAmountMinor, 'NGN')} for this USD listing?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await fxAgreementService.confirm(agreement.id, agreement.version);
      setNotice(`Agreement status: ${result.status}. Refresh the listing before continuing to payment.`);
      await refresh();
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'The agreement changed. Refresh before deciding again.'); }
    finally { setBusy(false); }
  };

  if (!profileId || (user?.role !== 'buyer' && user?.role !== 'owner')) return null;
  return <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4" aria-label="USD payment agreement">
    <h3 className="font-bold">USD {installment ? 'installment' : 'listing'} payment agreement</h3>
    <p className="mt-1 text-sm text-secondary">Buyer and seller must agree on the NGN payable amount. The server derives the rate and confirms the current {installment ? 'schedule item' : 'listing'}; an agreement expires at the end of the Lagos day.</p>
    <button type="button" className="mt-2 text-sm font-bold underline" disabled={loading || busy} onClick={() => void refresh()}>{loading ? 'Loading agreements…' : 'Refresh agreements'}</button>
    {error ? <p role="alert" className="mt-2 text-sm text-error">{error}</p> : null}
    {notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    {user?.role === 'buyer' ? <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-sm font-bold">Agreed amount (whole NGN)<input type="number" min="1" step="1" value={amountNgn} onChange={(event) => { setAmountNgn(event.target.value); operationKey.current = null; }} className="mt-1 block rounded-lg border p-2" /></label><button type="button" disabled={busy || loading} onClick={() => void propose()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">Propose amount</button></div> : null}
    {agreements.length ? <ul className="mt-4 space-y-2">{agreements.map((agreement) => <li key={agreement.id} className="rounded-lg bg-surface-container-low p-3 text-sm">
      <strong>{formatMoneyMinor(agreement.payableAmountMinor, 'NGN')}</strong> · {agreement.status.replaceAll('_', ' ')} · server rate {agreement.rateNgnPerUsd} NGN/USD · expires {new Date(agreement.expiresAt).toLocaleString('en-NG')}
      {agreement.buyerProfileId === profileId && isCurrentConfirmed(agreement) && (!installment || agreement.scheduleItemId === scheduleItemId) ? <label className="ml-3 inline-flex items-center gap-2"><input type="radio" name={`fx-${resourceKey}`} checked={selectedId === agreement.id} onChange={() => { setSelectedId(agreement.id); onSelect(agreement.id); }} />Use this confirmed agreement</label> : null}
      {agreement.sellerProfileId === profileId && agreement.status === 'proposed' && !agreement.consumedAt && Date.parse(agreement.expiresAt) > Date.now() && (!installment || agreement.scheduleItemId === scheduleItemId) ? <button type="button" disabled={busy} onClick={() => void confirm(agreement)} className="ml-3 font-bold underline disabled:opacity-50">Confirm as seller</button> : null}
    </li>)}</ul> : !loading ? <p className="mt-3 text-sm text-secondary">No FX agreements returned for this profile and listing.</p> : null}
  </section>;
};

export default PropertyFxAgreement;
