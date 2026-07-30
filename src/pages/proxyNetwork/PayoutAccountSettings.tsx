import { useState, type FormEvent } from "react";
import ProxyInspectorLayout from "../../components/layout/ProxyInspectorLayout";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { NIGERIAN_BANKS } from "../../features/proxyNetwork/nigerianBanks";
import { useProxyResource } from "../../features/proxyNetwork/useProxyResource";
import { proxyNetworkService } from "../../services/proxyNetworkService";
import type { PayoutAccountVerification } from "../../types/proxyNetwork";

const PayoutAccountSettings = () => {
  const resource = useProxyResource(
    (signal) => proxyNetworkService.getPayoutAccount(signal),
    [],
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [verification, setVerification] =
    useState<PayoutAccountVerification | null>(null);
  const [verifiedFor, setVerifiedFor] = useState<{
    accountNumber: string;
    bankCode: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const normalizedAccountNumber = accountNumber.trim();
  const selectedBank = NIGERIAN_BANKS.find((bank) => bank.code === bankCode);
  const canVerify = /^\d{10}$/.test(normalizedAccountNumber) && Boolean(bankCode);
  const canSave =
    Boolean(verification) &&
    verifiedFor?.accountNumber === normalizedAccountNumber &&
    verifiedFor?.bankCode === bankCode;

  const resetVerification = () => {
    setVerification(null);
    setVerifiedFor(null);
    setMessage("");
  };

  const verifyAccount = async () => {
    if (!canVerify) {
      setMessage("Select a bank and enter a valid 10-digit account number.");
      return;
    }
    setVerifying(true);
    setMessage("");
    setVerification(null);
    setVerifiedFor(null);
    try {
      const result = await proxyNetworkService.verifyPayoutAccount(
        normalizedAccountNumber,
        bankCode,
      );
      setVerification(result);
      setVerifiedFor({ accountNumber: normalizedAccountNumber, bankCode });
      setMessage("Account verified. Review the name below, then save.");
    } catch (raw) {
      setMessage(
        raw instanceof Error ? raw.message : "Unable to verify this account.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      setMessage("Verify this bank account before saving it.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await proxyNetworkService.savePayoutAccount(
        normalizedAccountNumber,
        bankCode,
      );
      setAccountNumber("");
      setBankCode("");
      setVerification(null);
      setVerifiedFor(null);
      setMessage("Payout account saved.");
      await resource.reload();
    } catch (raw) {
      setMessage(
        raw instanceof Error ? raw.message : "Unable to save this account.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProxyInspectorLayout title="Payout account">
      {resource.loading ? <LoadingState /> : null}
      {resource.error ? (
        <ErrorState
          message={resource.error.message}
          onRetry={() => void resource.reload()}
        />
      ) : null}
      {resource.data ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Verified payout account
          </p>
          <h2 className="mt-2 text-2xl font-black">{resource.data.bankName}</h2>
          <p className="mt-2">
            {resource.data.maskedAccountNumber} ·{" "}
            {resource.data.verifiedAccountName}
          </p>
          <p className="mt-2 text-xs text-secondary">
            Verified {new Date(resource.data.verifiedAt).toLocaleString()}
          </p>
        </section>
      ) : null}
      <form
        onSubmit={(e) => void submit(e)}
        autoComplete="off"
        className="mt-6 max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-black">
          {resource.data ? "Replace account" : "Configure account"}
        </h2>
        <p className="text-sm text-secondary">
          Select your bank, enter your account number, verify the account name,
          then save it as your payout destination.
        </p>
        <label className="block text-sm font-bold">
          Bank
          <select
            required
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              resetVerification();
            }}
            className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal"
          >
            <option value="">Select bank</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Account number
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
              resetVerification();
            }}
            className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal"
          />
        </label>
        <button
          type="button"
          disabled={!canVerify || verifying || saving}
          onClick={() => void verifyAccount()}
          className="block w-full rounded-lg border border-primary px-5 py-3 font-bold text-primary disabled:opacity-50 sm:w-auto"
        >
          {verifying ? "Verifying…" : "Verify account"}
        </button>
        {verification ? (
          <section
            aria-label="Verified account details"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Verified account name
            </p>
            <p className="mt-1 text-lg font-black text-on-surface">
              {verification.verifiedAccountName}
            </p>
            <p className="mt-1 text-secondary">
              {verification.bankName || selectedBank?.name}
            </p>
          </section>
        ) : null}
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        <button
          disabled={!canSave || verifying || saving}
          className="block w-full rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Saving…" : "Save payout account"}
        </button>
      </form>
    </ProxyInspectorLayout>
  );
};
export default PayoutAccountSettings;
