import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import StepUpDialog from '../auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { escrowService } from '../../services/escrowService';
import type { Escrow, RefundAccountDetailsResponse } from '../../types/escrow';

const BuyerRefundAccountForm = ({
  escrow,
  onChanged,
}: {
  escrow: Escrow;
  onChanged: () => void | Promise<unknown>;
}) => {
  const { activeProfile } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<RefundAccountDetailsResponse | null>(null);
  const stepUp = useBoundStepUp<RefundAccountDetailsResponse>();
  if (
    activeProfile?.kind !== 'buyer' ||
    escrow.participants?.buyer?.profileId !== activeProfile.id ||
    escrow.refundStatus !== 'needs_account_details'
  ) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!/^\d{10}$/.test(accountNumber.trim()) || !bankCode.trim() || !bankName.trim()) {
      setError('Enter a valid 10-digit account number, bank code, and bank name.');
      return;
    }
    setError(null);
    const body = {
      accountNumber: accountNumber.trim(),
      bankCode: bankCode.trim(),
      bankName: bankName.trim(),
    };
    await stepUp.begin({
      method: 'POST',
      path: `/api/escrow/${encodeURIComponent(escrow._id)}/refund-account-details`,
      body,
      label: 'Submit refund account details',
      execute: async (challengeId, exactBody) => {
        setPending(true);
        try { return await escrowService.saveRefundDetails(escrow._id, exactBody, challengeId); }
        finally { setPending(false); }
      },
    });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      setError(result.error ?? 'Refund account details could not be submitted.');
      if (result.code?.startsWith('CONFLICT_')) await onChanged();
      return false;
    }
    setVerified(result.value);
    setAccountNumber('');
    setBankCode('');
    setBankName('');
    toast.success('Refund account details verified and submitted.');
    try { await onChanged(); }
    catch { setError('The account details were submitted. Refresh escrow status before continuing.'); }
    return true;
  };

  return (
    <section className="rounded-xl bg-white p-5 sm:p-7" aria-labelledby="buyer-refund-account-title">
      <h2 id="buyer-refund-account-title" className="text-xl font-bold">Refund account details</h2>
      <p className="mt-2 text-sm text-secondary">
        Paystack requested account details to continue this refund. Submit only through this secure form—not the refund chat.
      </p>
      {verified ? (
        <dl className="mt-4 grid gap-3 rounded-lg bg-emerald-50 p-4 text-sm sm:grid-cols-3">
          <div><dt className="font-bold">Verified name</dt><dd>{verified.accountName}</dd></div>
          <div><dt className="font-bold">Account</dt><dd>{verified.maskedAccountNumber}</dd></div>
          <div><dt className="font-bold">Bank</dt><dd>{verified.bankName}</dd></div>
        </dl>
      ) : (
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
          <label className="text-sm font-bold">
            Account number
            <input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={stepUp.busy || Boolean(stepUp.challenge)}
              inputMode="numeric"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
              required
            />
          </label>
          <label className="text-sm font-bold">
            Bank code
            <input value={bankCode} onChange={(event) => setBankCode(event.target.value)} disabled={stepUp.busy || Boolean(stepUp.challenge)} autoComplete="off" className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Bank name
            <input value={bankName} onChange={(event) => setBankName(event.target.value)} disabled={stepUp.busy || Boolean(stepUp.challenge)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required />
          </label>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p> : null}
          <button type="submit" disabled={pending || stepUp.busy || Boolean(stepUp.challenge)} className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50 sm:col-span-2">
            {pending || stepUp.busy ? 'Confirming details...' : 'Submit refund account'}
          </button>
        </form>
      )}
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy || pending} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
    </section>
  );
};

export default BuyerRefundAccountForm;
