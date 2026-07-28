import { useState, type FormEvent } from 'react';
import ProxyInspectorLayout from '../../components/layout/ProxyInspectorLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useProxyResource } from '../../features/proxyNetwork/useProxyResource';
import { proxyNetworkService } from '../../services/proxyNetworkService';

const PayoutAccountSettings = () => {
  const resource = useProxyResource((signal) => proxyNetworkService.getPayoutAccount(signal), []);
  const [accountNumber, setAccountNumber] = useState(''); const [bankCode, setBankCode] = useState('');
  const [pending, setPending] = useState(false); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setPending(true); setMessage('');
    try { await proxyNetworkService.savePayoutAccount(accountNumber.trim(), bankCode.trim()); setAccountNumber(''); setBankCode(''); setMessage('Payout account verified and saved.'); await resource.reload(); }
    catch (raw) { setMessage(raw instanceof Error ? raw.message : 'Unable to verify this account.'); } finally { setPending(false); }
  };
  return <ProxyInspectorLayout title="Payout account">{resource.loading ? <LoadingState /> : null}{resource.error ? <ErrorState message={resource.error.message} onRetry={() => void resource.reload()} /> : null}
    {resource.data ? <section className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verified payout account</p><h2 className="mt-2 text-2xl font-black">{resource.data.bankName}</h2><p className="mt-2">{resource.data.maskedAccountNumber} · {resource.data.verifiedAccountName}</p><p className="mt-2 text-xs text-secondary">Verified {new Date(resource.data.verifiedAt).toLocaleString()}</p></section> : null}
    <form onSubmit={(e) => void submit(e)} autoComplete="off" className="mt-6 max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-black">{resource.data ? 'Replace account' : 'Configure account'}</h2><p className="text-sm text-secondary">The backend verifies the account with the payment provider. RealtiQ only returns a masked account number; the full number and bank code are cleared here after success.</p>
      <label className="block text-sm font-bold">Account number<input required inputMode="numeric" pattern="[0-9]+" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      <label className="block text-sm font-bold">Bank code<input required value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
      {message ? <p role="status" className="text-sm">{message}</p> : null}<button disabled={pending} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">{pending ? 'Verifying…' : 'Verify and save'}</button>
    </form>
  </ProxyInspectorLayout>;
};
export default PayoutAccountSettings;
