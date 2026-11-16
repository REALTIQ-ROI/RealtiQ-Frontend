import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import StepUpDialog from '../auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { useAsync } from '../../hooks/useAsync';
import { escrowService } from '../../services/escrowService';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';

const SellerPayoutAccountSettingsContent = () => {
  const { data, loading, error, execute } = useAsync(escrowService.getPayoutAccount, true);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const stepUp = useBoundStepUp<Awaited<ReturnType<typeof escrowService.savePayoutAccount>>>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!/^\d{10}$/.test(accountNumber) || !bankCode.trim() || !bankName.trim()) {
      setFormError('Enter a valid 10-digit account number, bank code, and bank name.');
      return;
    }
    setFormError(null);
    const body = { accountNumber, bankCode: bankCode.trim(), bankName: bankName.trim() };
    await stepUp.begin({
      method: 'PUT',
      path: '/api/escrow/payout-account',
      body,
      label: 'Save escrow payout account',
      execute: async (challengeId, exactBody) => {
        setPending(true);
        try { return await escrowService.savePayoutAccount(exactBody, challengeId); }
        finally { setPending(false); }
      },
    });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      setFormError(result.error ?? 'Escrow payout account could not be saved.');
      if (result.code?.startsWith('CONFLICT_')) await execute();
      return false;
    }
    setAccountNumber('');
    setBankCode('');
    setBankName('');
    toast.success('Escrow payout account verified.');
    try { await execute(); }
    catch { setFormError('The payout account was submitted. Refresh the account status before continuing.'); }
    return true;
  };

  return (
    <section className="mt-8 rounded-xl bg-surface-container-lowest p-8" aria-labelledby="payout-account-title">
      <h3 id="payout-account-title" className="text-lg font-bold">Escrow payout account</h3>
      <p className="mt-1 text-sm text-secondary">Required before an administrator can approve release of funded escrow to you.</p>
      {loading ? <LoadingState label="Loading payout account..." /> : (
        <>
          {data?.configured ? (
            <dl className="mt-5 grid gap-4 rounded-xl bg-emerald-50 p-4 text-sm sm:grid-cols-3">
              <div><dt className="font-bold">Verified account name</dt><dd>{data.verifiedAccountName}</dd></div>
              <div><dt className="font-bold">Account</dt><dd>{data.maskedAccountNumber}</dd></div>
              <div><dt className="font-bold">Bank</dt><dd>{data.bankName}</dd></div>
            </dl>
          ) : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No payout account is configured.</p>}
          {error ? <p role="alert" className="mt-4 text-sm text-error">{error}</p> : null}
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
            <label className="text-sm font-bold">Account number<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} disabled={stepUp.busy || Boolean(stepUp.challenge)} inputMode="numeric" autoComplete="off" className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required /></label>
            <label className="text-sm font-bold">Bank code<input value={bankCode} onChange={(event) => setBankCode(event.target.value)} disabled={stepUp.busy || Boolean(stepUp.challenge)} autoComplete="off" className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required /></label>
            <label className="text-sm font-bold sm:col-span-2">Bank name<input value={bankName} onChange={(event) => setBankName(event.target.value)} disabled={stepUp.busy || Boolean(stepUp.challenge)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required /></label>
            {formError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{formError}</p> : null}
          <Button type="submit" loading={pending || stepUp.busy} disabled={Boolean(stepUp.challenge)} loadingLabel="Confirming..." className="sm:col-span-2">
              {data?.configured ? 'Update payout account' : 'Configure payout account'}
            </Button>
          </form>
          <p className="mt-3 text-xs text-secondary">Only the masked, verified account is displayed after submission. The full account number is cleared from this form.</p>
        </>
      )}
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy || pending} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
    </section>
  );
};

const SellerPayoutAccountSettings = () => {
  const { activeProfile } = useAuth();
  return <SellerPayoutAccountSettingsContent key={activeProfile?.id ?? 'no-profile'} />;
};

export default SellerPayoutAccountSettings;
