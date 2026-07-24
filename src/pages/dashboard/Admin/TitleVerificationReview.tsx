import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import RegistryAuditDetails from '../../../components/title/RegistryAuditDetails';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError } from '../../../lib/axios';
import { documentService } from '../../../services/documentService';
import { titleVerificationService } from '../../../services/titleVerificationService';
import type { TitleDocumentRecord, TitleDocumentType, TitleRiskFlag, TitleVerification, TitleVerificationLog, TitleVerificationStatus } from '../../../types';
import { documentTypeLabel, externalAnchorLabel, formatDateTime, riskFlagText, shortenHash, titleDocumentTypeOptions } from '../../../utils/titleVerification';

const statusOptions: Array<TitleVerificationStatus | 'all'> = ['all', 'pending', 'under_review', 'approved', 'published', 'rejected', 'revoked', 'superseded'];

const propertyName = (verification: TitleVerification) => {
  const ref = verification.property ?? verification.propertyId;
  if (ref && typeof ref !== 'string') return ref.title ?? ref.id ?? ref._id ?? 'Property';
  return typeof ref === 'string' ? ref : 'Property';
};

const TitleVerificationReview = () => {
  const { token } = useAuth();
  const [status, setStatus] = useState<TitleVerificationStatus | 'all'>('pending');
  const [documentType, setDocumentType] = useState<TitleDocumentType | 'all'>('all');
  const [riskSeverity, setRiskSeverity] = useState('all');
  const [verifications, setVerifications] = useState<TitleVerification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TitleVerification | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<TitleDocumentRecord | null>(null);
  const [logs, setLogs] = useState<TitleVerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await titleVerificationService.listTitleVerifications({ status, limit: 100 });
      setVerifications(response.verifications);
      setSelectedId((current) => current ?? response.verifications[0]?.verificationId ?? null);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load title verifications.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedDocument(null);
    try {
      const response = await titleVerificationService.getTitleVerification(id);
      setSelected(response.verification);
      setLogs(response.logs ?? []);
      if (response.verification.document) {
        const documentResponse = await documentService.getDocument(String(response.verification.document));
        setSelectedDocument(documentResponse.document);
      }
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load title verification.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId]);

  const filtered = useMemo(() => verifications.filter((item) => {
    const typeMatches = documentType === 'all' || item.documentType === documentType;
    const riskMatches = riskSeverity === 'all' || (item.riskFlags ?? []).some((flag) => flag.severity === riskSeverity);
    return typeMatches && riskMatches;
  }), [documentType, riskSeverity, verifications]);

  const refreshAll = async (id = selectedId) => {
    await loadList();
    if (id) await loadDetail(id);
  };

  const review = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    const result = await Swal.fire<string>({
      title: decision === 'approve' ? 'Approve title verification?' : 'Reject title verification?',
      input: 'textarea',
      inputLabel: decision === 'approve' ? 'Review notes' : 'Rejection reason',
      inputPlaceholder: decision === 'approve' ? 'Title documents reviewed and approved.' : 'Explain what needs correction.',
      showCancelButton: true,
      confirmButtonText: decision === 'approve' ? 'Approve and Publish' : 'Reject',
      confirmButtonColor: decision === 'approve' ? '#173d32' : '#b42318',
      inputValidator: (value) => decision === 'reject' && !value.trim() ? 'Enter a rejection reason.' : undefined,
    });
    if (!result.isConfirmed) return;
    setMutating(true);
    try {
      const response = await titleVerificationService.reviewTitleVerification(selected.verificationId, {
        decision,
        reviewNotes: decision === 'approve' ? result.value || 'Title documents reviewed and approved.' : undefined,
        rejectionReason: decision === 'reject' ? result.value : undefined,
      }, token);
      toast.success(decision === 'approve' ? 'Title verification approved and published in the RealtiQ registry.' : 'Title verification rejected.');
      await refreshAll(response.verification.verificationId);
    } catch (raw) {
      const err = raw instanceof ApiRequestError ? raw : null;
      toast.error(err?.message ?? (raw instanceof Error ? raw.message : 'Unable to review title verification.'));
      if (err?.status === 409) await refreshAll(selected.verificationId);
    } finally {
      setMutating(false);
    }
  };

  const revoke = async () => {
    if (!selected) return;
    const result = await Swal.fire<string>({
      title: 'Revoke title verification?',
      input: 'textarea',
      inputLabel: 'Revocation reason',
      inputPlaceholder: 'Superseded by corrected title document.',
      showCancelButton: true,
      confirmButtonText: 'Revoke',
      confirmButtonColor: '#b42318',
      inputValidator: (value) => !value.trim() ? 'Enter a revocation reason.' : undefined,
    });
    if (!result.isConfirmed) return;
    setMutating(true);
    try {
      await titleVerificationService.revokeTitleVerification(selected.verificationId, { revocationReason: result.value ?? '' });
      toast.success('Title verification revoked. The public registry page remains visible with revoked status.');
      await refreshAll(selected.verificationId);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to revoke title verification.');
    } finally {
      setMutating(false);
    }
  };

  const requestExternalAnchor = async () => {
    if (!selected?.publicVerificationId) return;
    setMutating(true);
    try {
      await titleVerificationService.requestRegistryExternalAnchor(selected.publicVerificationId);
      toast.success('External anchor requested.');
      await refreshAll(selected.verificationId);
    } catch (raw) {
      const err = raw instanceof ApiRequestError ? raw : null;
      toast[err?.status === 409 ? 'info' : 'error'](raw instanceof Error ? raw.message : 'Unable to request external anchor.');
    } finally {
      setMutating(false);
    }
  };

  return (
    <AdminLayout>
      <main className="min-h-screen space-y-6 p-4 sm:p-8 lg:p-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Title Verification Review</h1>
          <p className="mt-2 text-sm text-secondary">Review legal title submissions, publish RealtiQ registry receipts, and manage revocations.</p>
        </div>
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,460px)]">
          <div className="min-w-0 rounded-xl bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as TitleVerificationStatus | 'all')}>
                {statusOptions.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
              </select>
              <select className="rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value as TitleDocumentType | 'all')}>
                <option value="all">All document types</option>
                {titleDocumentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select className="rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={riskSeverity} onChange={(event) => setRiskSeverity(event.target.value)}>
                <option value="all">All risk levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            {loading ? <LoadingState label="Loading review queue..." /> : (
              <div className="mt-5">
                <div className="space-y-3 md:hidden">
                  {filtered.map((item) => (
                    <button
                      key={item.verificationId}
                      type="button"
                      onClick={() => setSelectedId(item.verificationId)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${item.verificationId === selectedId ? 'border-primary bg-primary/5' : 'border-outline-variant/20 bg-white'}`}
                    >
                      <span className="block text-sm font-bold text-primary">{propertyName(item)}</span>
                      <span className="mt-1 block text-xs text-secondary">{documentTypeLabel(item.documentType)}</span>
                      <span className="mt-3 block"><TitleVerificationBadge summary={{ status: item.status === 'superseded' ? 'revoked' : item.status, badgeLabel: item.badgeLabel, publicVerificationId: item.publicVerificationId ?? undefined, externalAnchorStatus: item.externalAnchorStatus }} context="admin" /></span>
                      <span className="mt-3 block break-all font-mono text-[11px] text-secondary">{shortenHash(item.submissionHash)}</span>
                      <span className="mt-2 block text-xs text-secondary">{formatDateTime(item.submittedAt)} · {item.riskFlags?.length ? `${item.riskFlags.length} flag(s)` : 'No risks'}</span>
                    </button>
                  ))}
                  {!filtered.length ? <p className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No title verifications match these filters.</p> : null}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[900px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="text-xs uppercase tracking-widest text-secondary">
                    <tr>
                      <th className="px-3 py-3">Property</th>
                      <th className="px-3 py-3">Document</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Submitted</th>
                      <th className="px-3 py-3">Hash</th>
                      <th className="px-3 py-3">Risks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {filtered.map((item) => (
                      <tr key={item.verificationId} className={item.verificationId === selectedId ? 'bg-primary/5' : ''}>
                        <td className="px-3 py-4 align-top">
                          <button className="block max-w-full break-words text-left font-bold text-primary hover:underline" onClick={() => setSelectedId(item.verificationId)}>{propertyName(item)}</button>
                        </td>
                        <td className="break-words px-3 py-4 align-top">{documentTypeLabel(item.documentType)}</td>
                        <td className="px-3 py-4 align-top"><TitleVerificationBadge summary={{ status: item.status === 'superseded' ? 'revoked' : item.status, badgeLabel: item.badgeLabel, publicVerificationId: item.publicVerificationId ?? undefined, externalAnchorStatus: item.externalAnchorStatus }} context="admin" /></td>
                        <td className="break-words px-3 py-4 align-top text-xs text-secondary">{formatDateTime(item.submittedAt)}</td>
                        <td className="break-all px-3 py-4 align-top font-mono text-xs">{shortenHash(item.submissionHash)}</td>
                        <td className="px-3 py-4 align-top text-xs">{item.riskFlags?.length ? `${item.riskFlags.length} flag(s)` : 'None'}</td>
                      </tr>
                    ))}
                    {!filtered.length ? <tr><td colSpan={6} className="px-3 py-8 text-secondary">No title verifications match these filters.</td></tr> : null}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0 rounded-xl bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-6 xl:self-start">
            {detailLoading ? <LoadingState label="Loading verification..." /> : selected ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-secondary">Selected Verification</p>
                  <h2 className="mt-1 text-xl font-bold">{propertyName(selected)}</h2>
                  <div className="mt-3"><TitleVerificationBadge summary={{ status: selected.status === 'superseded' ? 'revoked' : selected.status, badgeLabel: selected.badgeLabel, publicVerificationId: selected.publicVerificationId ?? undefined, externalAnchorStatus: selected.externalAnchorStatus }} context="admin" /></div>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div><dt className="font-bold">Document ID</dt><dd className="break-all text-secondary">{selected.document ?? 'Not recorded'}</dd></div>
                  <div>
                    <dt className="font-bold">Actual document</dt>
                    <dd>
                      {selectedDocument ? (
                        <span className="text-secondary">Protected viewer access is available from the property management panel.</span>
                      ) : <span className="text-secondary">Document metadata unavailable</span>}
                    </dd>
                  </div>
                  <div><dt className="font-bold">Document type</dt><dd>{documentTypeLabel(selected.documentType)}</dd></div>
                  <div><dt className="font-bold">Submitted hash</dt><dd className="break-all font-mono text-xs">{selected.submissionHash ?? 'Not recorded'}</dd></div>
                  <div><dt className="font-bold">Verified hash</dt><dd className="break-all font-mono text-xs">{selected.verifiedDocumentHash ?? 'Pending legal approval'}</dd></div>
                  <div><dt className="font-bold">Public registry ID</dt><dd className="break-all">{selected.publicVerificationId ? <Link className="text-primary font-bold hover:underline" to={`/title-verification/${selected.publicVerificationId}`}>{selected.publicVerificationId}</Link> : 'Not published'}</dd></div>
                  <div><dt className="font-bold">External anchor</dt><dd>{externalAnchorLabel(selected.externalAnchor?.status ?? selected.externalAnchorStatus)}</dd></div>
                  {selected.rejectionReason ? <div><dt className="font-bold">Rejection reason</dt><dd>{selected.rejectionReason}</dd></div> : null}
                  {selected.revocationReason ? <div><dt className="font-bold">Revocation reason</dt><dd>{selected.revocationReason}</dd></div> : null}
                </dl>
                {selected.riskFlags?.length ? (
                  <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">Legal-review risk flags</p>
                    <ul className="mt-2 space-y-1">{selected.riskFlags.map((flag: TitleRiskFlag, index) => <li key={flag._id ?? `${flag.type}-${index}`}>{riskFlagText(flag)}</li>)}</ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {['pending', 'under_review'].includes(selected.status) ? <Button disabled={mutating} onClick={() => void review('approve')}>Approve</Button> : null}
                  {['pending', 'under_review'].includes(selected.status) ? <Button variant="secondary" disabled={mutating} onClick={() => void review('reject')}>Reject</Button> : null}
                  {selected.status === 'published' ? <Button variant="secondary" disabled={mutating} onClick={() => void revoke()}>Revoke</Button> : null}
                  {selected.status === 'published' && selected.publicVerificationId ? <Button variant="ghost" disabled={mutating} onClick={() => void requestExternalAnchor()}>Request External Anchor</Button> : null}
                </div>
                <RegistryAuditDetails publicVerificationId={selected.publicVerificationId} />
                <div>
                  <h3 className="font-bold">Audit Logs</h3>
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {logs.map((log) => <div key={log._id} className="rounded-lg bg-surface-container-low p-3 text-xs"><p className="font-bold">{log.action.replaceAll('_', ' ')}</p><p className="text-secondary">{formatDateTime(log.createdAt)}</p>{log.note ? <p className="mt-1">{log.note}</p> : null}</div>)}
                    {!logs.length ? <p className="text-sm text-secondary">No audit logs returned.</p> : null}
                  </div>
                </div>
              </div>
            ) : <p className="text-sm text-secondary">Select a title verification to inspect.</p>}
          </aside>
        </section>
      </main>
    </AdminLayout>
  );
};

export default TitleVerificationReview;
