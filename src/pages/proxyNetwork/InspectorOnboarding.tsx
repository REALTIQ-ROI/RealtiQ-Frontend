import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import ProxyInspectorLayout from '../../components/layout/ProxyInspectorLayout';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import type { User } from '../../types';
import type { VerificationStatus } from '../../types/proxyNetwork';

const normalizeStatus = (value?: string | null) =>
  (value || '').trim().toLowerCase().replaceAll(' ', '_');

const readSessionStatus = (currentUser: User | null) =>
  currentUser?.kyc?.status || (currentUser?.emailVerified ? 'kyc_pending' : 'registration_pending');

const InspectorOnboarding = () => {
  const { user, refreshUser } = useAuth();
  const userRef = useRef<User | null>(user);
  const [profileStatus, setProfileStatus] = useState<VerificationStatus | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const status = normalizeStatus(profileStatus || readSessionStatus(user));
  const canSubmit = user?.emailVerified === true && ['not_submitted', 'kyc_pending', 'pending', 'rejected'].includes(status);
  const [values, setValues] = useState({ fullLegalName: '', phone: user?.phone || '', address: '', nationalId: '', labels: '' });
  const [idDocument, setIdDocument] = useState<File>(); const [selfie, setSelfie] = useState<File>(); const [documents, setDocuments] = useState<File[]>([]);
  const [pending, setPending] = useState(false); const [message, setMessage] = useState(''); const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshLatestStatus = useCallback(async (silent = false) => {
    if (!userRef.current?._id) return;
    if (!silent) setStatusMessage('');
    setStatusPending(true);
    try {
      const refreshed = await refreshUser();
      const currentUser = refreshed || userRef.current;
      if (!currentUser) return;
      userRef.current = currentUser;
      if (currentUser.role === 'proxy_inspector') {
        try {
          const profile = await proxyNetworkService.getPublicInspector(currentUser._id);
          setProfileStatus(profile.verificationStatus || null);
        } catch (raw) {
          if (!(raw instanceof ApiRequestError && [403, 404].includes(raw.status || 0))) {
            throw raw;
          }
          setProfileStatus(null);
        }
      }
      if (!silent) setStatusMessage('Status refreshed from the server.');
    } catch (raw) {
      if (!silent) setStatusMessage(raw instanceof Error ? raw.message : 'Unable to refresh status.');
    } finally {
      setStatusPending(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    void refreshLatestStatus(true);
  }, [refreshLatestStatus]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setMissing([]);
    if (!idDocument || !selfie) return setMessage('An identity document and selfie are required.');
    if (documents.length > 8) return setMessage('Upload no more than 8 professional documents.');
    setPending(true);
    try {
      const labels = values.labels.split('\n').map((v) => v.trim()).filter(Boolean);
      const result = await proxyNetworkService.submitKyc({ fullLegalName: values.fullLegalName.trim(), phone: values.phone.trim(), address: values.address.trim(), nationalId: values.nationalId.trim(), idDocument, selfie, professionalDocuments: documents, professionalDocumentLabels: labels });
      setValues({ fullLegalName: '', phone: '', address: '', nationalId: '', labels: '' }); setIdDocument(undefined); setSelfie(undefined); setDocuments([]); setProfileStatus(result.verificationStatus);
      setMessage(`KYC submitted. Status: ${result.verificationStatus.replaceAll('_', ' ')}.`); await refreshUser();
    } catch (raw) { setMessage(raw instanceof Error ? raw.message : 'KYC submission failed.'); if (raw instanceof ApiRequestError && raw.details && typeof raw.details === 'object' && 'missing' in raw.details) setMissing((raw.details as { missing?: string[] }).missing || []); } finally { setPending(false); }
  };
  return <ProxyInspectorLayout title="Verification and onboarding"><section className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-secondary">Current status</p><h2 className="mt-2 text-3xl font-black capitalize">{status.replaceAll('_', ' ')}</h2>
    {!user?.emailVerified ? <p className="mt-3 text-secondary">Verify your email using the link sent during registration before submitting KYC.</p> : null}
    {status === 'under_review' ? <p className="mt-3 text-secondary">Your identity and professional documents are under Admin review. Uploaded credentials remain unverified until explicitly approved.</p> : null}
    {status === 'approved' ? <p className="mt-3 text-emerald-800">Your professional profile is approved. Public visibility and availability remain realtiq-controlled.</p> : null}
    {status === 'suspended' ? <p className="mt-3 text-red-800">Your profile is suspended and hidden from discovery. Existing task history remains available.</p> : null}
    {status === 'rejected' ? <p className="mt-3 text-red-800">Your submission was not approved. Review any reason supplied by RealtiQ before resubmitting.</p> : null}
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void refreshLatestStatus(false)} disabled={statusPending} className="rounded-lg border border-outline px-4 py-2 text-sm font-bold disabled:opacity-50">{statusPending ? 'Refreshing...' : 'Refresh status'}</button>
      {statusMessage ? <p role="status" className="text-sm text-secondary">{statusMessage}</p> : null}
    </div>
  </section>
  {canSubmit ? <form className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm" onSubmit={(e) => void submit(e)} autoComplete="off"><h2 className="text-2xl font-black">Secure KYC submission</h2><p className="text-sm text-secondary">These details are sent securely to RealTIQ and are not saved in browser storage. Uploaded credentials remain unverified until RealTIQ review.</p>
    {([['fullLegalName','Full legal name'],['phone','Phone'],['address','Residential address'],['nationalId','National ID']] as const).map(([key,label]) => <label key={key} className="block text-sm font-bold">{label}<input required value={values[key]} onChange={(e) => setValues((old) => ({...old,[key]:e.target.value}))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>)}
    <label className="block text-sm font-bold">Identity document (required image)<input required type="file" accept="image/*" onChange={(e) => setIdDocument(e.target.files?.[0])} className="mt-2 block w-full rounded-lg bg-surface-container-low p-3" /></label>
    <label className="block text-sm font-bold">Selfie (required image)<input required type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0])} className="mt-2 block w-full rounded-lg bg-surface-container-low p-3" /></label>
    <label className="block text-sm font-bold">Professional documents (up to 8)<input multiple type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setDocuments(Array.from(e.target.files || []))} className="mt-2 block w-full rounded-lg bg-surface-container-low p-3" /></label>
    <label className="block text-sm font-bold">Document labels (one per line)<textarea value={values.labels} onChange={(e) => setValues((old) => ({...old,labels:e.target.value}))} className="mt-2 min-h-24 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" /></label>
    {message ? <div role="status" className="rounded-lg bg-surface-container-low p-4 text-sm">{message}{missing.length ? <ul className="mt-2 list-disc pl-5">{missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : null}
    <button disabled={pending} className="rounded-lg bg-primary px-6 py-3 font-bold text-on-primary disabled:opacity-50">{pending ? 'Submitting securely...' : 'Submit KYC'}</button>
  </form> : null}</ProxyInspectorLayout>;
};
export default InspectorOnboarding;
