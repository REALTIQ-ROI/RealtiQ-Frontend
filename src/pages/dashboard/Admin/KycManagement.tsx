import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { verificationService } from '../../../services/verificationService';
import type { User } from '../../../types';

type PreviewKind = 'image' | 'document';

interface PreviewState {
  title: string;
  url: string;
  kind: PreviewKind;
}

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const formatStatus = (value?: string) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Not Submitted';

const getPreviewKind = (url: string): PreviewKind =>
  url.toLowerCase().endsWith('.pdf') ? 'document' : 'image';

const KycBadge = ({ status }: { status?: string }) => {
  const className =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : status === 'rejected'
          ? 'bg-red-50 text-red-700'
          : 'bg-surface-container-high text-on-surface';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {formatStatus(status)}
    </span>
  );
};

const KycThumbnail = ({
  title,
  url,
  kind,
  onPreview,
}: {
  title: string;
  url: string;
  kind: PreviewKind;
  onPreview: (preview: PreviewState) => void;
}) => (
  <button
    type="button"
    onClick={() => onPreview({ title, url, kind })}
    className="group overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-left transition-all hover:border-primary/40"
  >
    <div className="aspect-square bg-surface-container-low flex items-center justify-center">
      {kind === 'document' ? (
        <div className="text-center p-3">
          <span className="material-symbols-outlined text-3xl text-primary">description</span>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Document</p>
        </div>
      ) : (
        <img src={url} alt={title} className="h-full w-full object-cover" />
      )}
    </div>
    <div className="p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-secondary">{title}</p>
      <p className="mt-1 text-xs text-on-surface">Click to preview</p>
    </div>
  </button>
);

const ManageKyc = () => {
  const { data, loading, error, execute } = useAsync(() => verificationService.fetchLandlordRequests(), true);
  const [activeStatus, setActiveStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const landlords = useMemo(() => data ?? [], [data]);
  const requests = useMemo(() => landlords.filter((landlord) => landlord.kyc?.status), [landlords]);

  const filtered = useMemo(() => {
    if (activeStatus === 'all') return requests;
    return requests.filter((landlord) => landlord.kyc?.status === activeStatus);
  }, [activeStatus, requests]);

  const pendingCount = requests.filter((landlord) => landlord.kyc?.status === 'pending').length;
  const approvedCount = requests.filter((landlord) => landlord.kyc?.status === 'approved').length;
  const rejectedCount = requests.filter((landlord) => landlord.kyc?.status === 'rejected').length;

  const handleReview = async (landlord: User, approved: boolean) => {
    if (landlord.kyc?.status !== 'pending') {
      toast.error('Only pending KYC submissions can be reviewed. Ask the landlord to resubmit a new KYC after rejection.');
      return;
    }

    setProcessingId(landlord._id);
    try {
      await verificationService.reviewVerification(landlord._id, approved);
      toast.success(approved ? 'KYC approved successfully.' : 'KYC rejected successfully.');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update KYC review.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">Compliance Review</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-primary">KYC Management</h2>
            <p className="text-sm text-secondary mt-2">Review landlord verification submissions and documents.</p>
          </div>
          <Button variant="secondary" onClick={() => void execute()}>
            Refresh
          </Button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-surface-container-lowest p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Total Requests</p>
            <p className="mt-2 text-3xl font-extrabold">{requests.length}</p>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Pending</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Approved</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">{approvedCount}</p>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Rejected</p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">{rejectedCount}</p>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeStatus === status
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {status === 'all' ? 'All Requests' : formatStatus(status)}
            </button>
          ))}
        </section>

        {loading ? (
          <LoadingState label="Loading KYC requests..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-lowest py-20 text-center text-secondary">
            <span className="material-symbols-outlined text-5xl opacity-30">verified_user</span>
            <p className="mt-3 text-sm font-semibold">No KYC requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
            <table className="min-w-[1200px] w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">Landlord</th>
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">Submission</th>
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">Status</th>
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">National ID</th>
                  <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">Documents</th>
                  <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((landlord) => {
                  const kyc = landlord.kyc;
                  const selfieKind = kyc?.selfieUrl ? getPreviewKind(kyc.selfieUrl) : 'image';
                  const idDocumentKind = kyc?.idDocumentUrl ? getPreviewKind(kyc.idDocumentUrl) : 'image';
                  return (
                    <tr key={landlord._id} className="align-top">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-on-surface">{landlord.name}</p>
                          <p className="text-sm text-secondary">{landlord.email}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-secondary">Verified Landlord</span>
                            <KycBadge status={kyc?.status ?? (landlord.landlordVerified ? 'approved' : undefined)} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        <p>{formatDate(kyc?.submittedAt)}</p>
                        <p className="text-[10px] uppercase tracking-widest text-secondary mt-1">Submitted</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <KycBadge status={kyc?.status} />
                          <p className="text-[10px] uppercase tracking-widest text-secondary">
                            {kyc?.status === 'rejected'
                              ? 'Resubmission required'
                              : landlord.landlordVerified
                                ? 'Landlord approved'
                                : 'Review required'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        <p className="font-medium">{kyc?.nationalId ?? 'N/A'}</p>
                        <p className="text-[10px] uppercase tracking-widest text-secondary mt-1">Full name: {kyc?.fullLegalName ?? 'N/A'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          {kyc?.selfieUrl ? (
                            <KycThumbnail
                              title="Selfie"
                              url={kyc.selfieUrl}
                              kind={selfieKind}
                              onPreview={setPreview}
                            />
                          ) : (
                            <div className="rounded-xl border border-dashed border-outline-variant/20 p-4 text-center text-xs text-secondary">
                              No selfie
                            </div>
                          )}
                          {kyc?.idDocumentUrl ? (
                            <KycThumbnail
                              title="ID Document"
                              url={kyc.idDocumentUrl}
                              kind={idDocumentKind}
                              onPreview={setPreview}
                            />
                          ) : (
                            <div className="rounded-xl border border-dashed border-outline-variant/20 p-4 text-center text-xs text-secondary">
                              No document
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            loading={processingId === landlord._id}
                            loadingLabel="Approving..."
                            disabled={kyc?.status !== 'pending'}
                            onClick={() => void handleReview(landlord, true)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            loading={processingId === landlord._id}
                            loadingLabel="Rejecting..."
                            disabled={kyc?.status !== 'pending'}
                            onClick={() => void handleReview(landlord, false)}
                          >
                            Reject
                          </Button>
                        </div>
                        {kyc?.status === 'rejected' ? (
                          <p className="mt-2 text-[10px] uppercase tracking-widest text-secondary">
                            Awaiting a new KYC submission
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setPreview(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="max-w-4xl w-full" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 text-center text-white">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/60">{preview.title}</p>
            </div>
            {preview.kind === 'document' ? (
              <iframe src={preview.url} className="h-[80vh] w-full rounded-xl bg-white" title={preview.title} />
            ) : (
              <img src={preview.url} alt={preview.title} className="max-h-[80vh] w-full object-contain rounded-xl" />
            )}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default ManageKyc;
