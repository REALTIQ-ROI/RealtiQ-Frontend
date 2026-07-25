import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { escrowErrorDetails, escrowService } from '../../services/escrowService';
import type { Escrow, RefundAccountDetailsResponse } from '../../types/escrow';
import { escrowBuyer } from '../../types/escrow';

const BuyerRefundAccountForm = ({
  escrow,
  onChanged,
}: {
  escrow: Escrow;
  onChanged: () => void | Promise<unknown>;
}) => {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<RefundAccountDetailsResponse | null>(null);
  const buyer = escrowBuyer(escrow);

  if (
    user?.role !== 'buyer' ||
    buyer?._id !== user._id ||
    escrow.refundStatus !== 'needs_account_details'
  ) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!/^\d{10}$/.test(accountNumber.trim()) || !bankCode.trim() || !bankName.trim()) {
      setError('Enter a valid 10-digit account number, bank code, and bank name.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await escrowService.saveRefundDetails(escrow._id, {
        accountNumber: accountNumber.trim(),
        bankCode: bankCode.trim(),
        bankName: bankName.trim(),
      });
      setVerified(response);
      setAccountNumber('');
      setBankCode('');
      setBankName('');
      toast.success('Refund account details verified and submitted.');
      await onChanged();
    } catch (raw) {
      setError(escrowErrorDetails(raw).message);
    } finally {
      setPending(false);
    }
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
              inputMode="numeric"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal"
              required
            />
          </label>
          <label className="text-sm font-bold">
            Bank code
            <input value={bankCode} onChange={(event) => setBankCode(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Bank name
            <input value={bankName} onChange={(event) => setBankName(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/30 p-3 font-normal" required />
          </label>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p> : null}
          <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50 sm:col-span-2">
            {pending ? 'Verifying details...' : 'Submit refund account'}
          </button>
        </form>
      )}
    </section>
  );
};

export default BuyerRefundAccountForm;
