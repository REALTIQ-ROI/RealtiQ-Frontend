import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import { verificationService } from '../../../services/verificationService';

type PreviewKind = 'image' | 'document';

interface PreviewState {
  title: string;
  url: string;
  kind: PreviewKind;
}

const ID_TYPES = [{ label: 'National Identification Number (NIN)', value: 'nin' }];
const NIN_LENGTH = 11;

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const formatStatus = (value?: string) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Not Submitted';

const getPreviewKind = (url: string, mimeType?: string): PreviewKind =>
  mimeType?.startsWith('application/pdf') || url.toLowerCase().endsWith('.pdf') ? 'document' : 'image';

const KycPreview = ({
  title,
  url,
  kind,
  onPreview,
}: {
  title: string;
  url: string;
  kind: PreviewKind;
  onPreview: (preview: PreviewState) => void;
}) => {
  return (
    <button
      type="button"
      onClick={() => onPreview({ title, url, kind })}
      className="group w-full text-left overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest transition-all hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="aspect-[4/3] bg-surface-container-low flex items-center justify-center">
        {kind === 'document' ? (
          <div className="text-center px-4">
            <span className="material-symbols-outlined text-4xl text-primary">description</span>
            <p className="mt-2 text-sm font-semibold text-on-surface">Open document preview</p>
          </div>
        ) : (
          <img src={url} alt={title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">{title}</p>
        <p className="mt-1 text-sm font-medium text-on-surface">Tap to view full preview</p>
      </div>
    </button>
  );
};

const LandlordVerification = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );

  const account = profile ?? user;
  const kyc = account?.kyc ?? null;

  const [fullLegalName, setFullLegalName] = useState(account?.name ?? '');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('nin');
  const [nationalId, setNationalId] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [idDocumentFileType, setIdDocumentFileType] = useState('');
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [idUploading, setIdUploading] = useState(false);
  const [selfieProgress, setSelfieProgress] = useState(0);
  const [idProgress, setIdProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fullLegalName?: string; address?: string; nationalId?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    setFullLegalName(kyc?.fullLegalName ?? account?.name ?? '');
    setAddress(kyc?.address ?? '');
    setNationalId(kyc?.nationalId ?? '');
    setSelfieUrl(kyc?.selfieUrl ?? '');
    setIdDocumentUrl(kyc?.idDocumentUrl ?? '');
  }, [account?.name, kyc?.address, kyc?.fullLegalName, kyc?.idDocumentUrl, kyc?.nationalId, kyc?.selfieUrl]);

  const isVerified = Boolean(account?.landlordVerified || kyc?.status === 'approved');
  const isPending = kyc?.status === 'pending';
  const isRejected = kyc?.status === 'rejected';
  const canSubmitKyc = !isVerified && !isPending;

  const statusLabel = useMemo(() => {
    if (isVerified) return 'Verified Landlord';
    if (isPending) return 'Verification Under Review';
    if (isRejected) return 'Verification Rejected';
    return 'Verification Required';
  }, [isPending, isRejected, isVerified]);

  const validateNationalId = (value: string) => {
    if (!value) return 'NIN is required.';
    if (!/^\d+$/.test(value)) return 'NIN can only contain numeric characters.';
    if (value.length !== NIN_LENGTH) return 'NIN must be exactly 11 digits.';
    return '';
  };

  const uploadFile = async (
    file: File | null,
    target: 'selfie' | 'document',
    setter: (url: string) => void,
    typeSetter?: (mime: string) => void,
  ) => {
    if (!file) return;
    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Files must be smaller than ${maxSizeMb}MB.`);
      return;
    }

    try {
      if (target === 'selfie') {
        setSelfieUploading(true);
        setSelfieProgress(0);
      } else {
        setIdUploading(true);
        setIdProgress(0);
      }

      const url = await verificationService.uploadVerificationFile(file, (percent) => {
        if (target === 'selfie') {
          setSelfieProgress(percent);
        } else {
          setIdProgress(percent);
        }
      });

      setter(url);
      typeSetter?.(file.type);
      toast.success(`${target === 'selfie' ? 'Selfie' : 'ID document'} uploaded successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      if (target === 'selfie') {
        setSelfieUploading(false);
        setSelfieProgress(0);
      } else {
        setIdUploading(false);
        setIdProgress(0);
      }
    }
  };

  const handleSelfieChange = (event: ChangeEvent<HTMLInputElement>) => {
    void uploadFile(event.target.files?.[0] ?? null, 'selfie', setSelfieUrl);
    event.target.value = '';
  };

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    void uploadFile(event.target.files?.[0] ?? null, 'document', setIdDocumentUrl, setIdDocumentFileType);
    event.target.value = '';
  };

  const handleNinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, NIN_LENGTH);
    setNationalId(digits);
    setFieldErrors((current) => ({
      ...current,
      nationalId: digits.length === 0 ? 'NIN is required.' : digits.length === NIN_LENGTH ? '' : 'NIN must be exactly 11 digits.',
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account) return;

    const nextErrors = {
      fullLegalName: fullLegalName.trim() ? '' : 'Full legal name is required.',
      address: address.trim() ? '' : 'Address is required.',
      nationalId: validateNationalId(nationalId),
    };

    setFieldErrors(nextErrors);
    if (nextErrors.fullLegalName || nextErrors.address || nextErrors.nationalId || !selfieUrl || !idDocumentUrl) {
      setFormError('Complete all required fields and uploads before submitting.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await verificationService.submitVerification({
        fullLegalName: fullLegalName.trim(),
        nationalId,
        address: address.trim(),
        idDocumentUrl,
        selfieUrl,
      });
      toast.success('KYC submitted for review.');
      await refreshUser();
      await execute();
      navigate('/dashboard/landlord/settings');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const kycStatusBadge =
    isVerified || kyc?.status === 'approved'
      ? 'bg-emerald-50 text-emerald-700'
      : isPending
        ? 'bg-amber-50 text-amber-700'
        : kyc?.status === 'rejected'
          ? 'bg-red-50 text-red-700'
          : 'bg-surface-container-high text-on-surface';

  return (
    <LandlordPortalLayout active="verification" title="KYC Verification">
      <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">Account Compliance</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-primary">{statusLabel}</h2>
            <p className="text-sm text-secondary mt-2 max-w-2xl">
              Complete and submit your KYC details before listing any property.
            </p>
          </div>
          <Link
            to="/dashboard/landlord/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Settings
          </Link>
        </div>

        {loading ? (
          <LoadingState label="Loading verification profile..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : (
          <div className="space-y-8">
            <section className="rounded-2xl bg-surface-container-lowest p-6 lg:p-8 border border-outline-variant/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-secondary font-bold">Verification Status</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{statusLabel}</h3>
                  <p className="mt-2 text-sm text-secondary max-w-2xl">
                    {isVerified
                      ? 'Your account is approved and you can upload properties.'
                      : isPending
                        ? 'Your KYC documents are currently being reviewed by our team.'
                        : isRejected
                          ? 'Your previous KYC was rejected. Update the details below and resubmit a fresh application.'
                        : 'Submit your KYC details to unlock property uploads.'}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${kycStatusBadge}`}>
                  {formatStatus(kyc?.status)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Approval Date</p>
                  <p className="mt-2 text-base font-semibold">{formatDate(kyc?.reviewedAt)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Submission Date</p>
                  <p className="mt-2 text-base font-semibold">{formatDate(kyc?.submittedAt)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Verification Badge</p>
                  <p className="mt-2 text-base font-semibold">
                    {isVerified ? 'Verified Landlord' : isRejected ? 'Rejected - Resubmission Required' : 'Pending Review'}
                  </p>
                </div>
              </div>
            </section>

            {isVerified ? (
              <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-emerald-600">verified</span>
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">Verified Landlord</h3>
                    <p className="text-sm text-secondary mt-1">
                      Your KYC is approved. No further submission is required.
                    </p>
                  </div>
                </div>
              </section>
            ) : isPending ? (
              <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-amber-600">hourglass_top</span>
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">Verification Under Review</h3>
                    <p className="text-sm text-secondary mt-1">
                      Your KYC documents are currently being reviewed by our team.
                    </p>
                  </div>
                </div>
              </section>
            ) : canSubmitKyc ? (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <section className="rounded-2xl bg-surface-container-lowest p-6 lg:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                      <h3 className="text-lg font-bold mb-1">Personal Information</h3>
                      <p className="text-sm text-secondary">
                        Enter the legal name and address that match your identity documents.
                      </p>
                    </div>
                    <div className="lg:col-span-2 space-y-5">
                      <Input
                        label="Full Legal Name"
                        value={fullLegalName}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFullLegalName(value);
                          setFieldErrors((current) => ({ ...current, fullLegalName: value.trim() ? '' : 'Full legal name is required.' }));
                        }}
                        error={fieldErrors.fullLegalName}
                        placeholder="John Doe"
                      />
                      <div className="space-y-2">
                        <label className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">
                          Address
                        </label>
                        <textarea
                          className="w-full min-h-28 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-surface-tint/20"
                          value={address}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAddress(value);
                            setFieldErrors((current) => ({ ...current, address: value.trim() ? '' : 'Address is required.' }));
                          }}
                          placeholder="12 Allen Avenue, Lagos"
                        />
                        {fieldErrors.address ? <p className="text-error text-xs">{fieldErrors.address}</p> : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-surface-container-lowest p-6 lg:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                      <h3 className="text-lg font-bold mb-1">National Identity Verification</h3>
                      <p className="text-sm text-secondary">Use your NIN and supporting ID document.</p>
                    </div>
                    <div className="lg:col-span-2 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-on-surface font-label text-xs font-bold uppercase tracking-wider">
                            ID Type
                          </label>
                          <select
                            className="w-full appearance-none bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-surface-tint/20"
                            value={idType}
                            onChange={(event) => setIdType(event.target.value)}
                          >
                            {ID_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="National ID Number"
                          value={nationalId}
                          onChange={(event) => handleNinChange(event.target.value)}
                          error={fieldErrors.nationalId}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="12345678909"
                          maxLength={NIN_LENGTH}
                        />
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-secondary">Selfie Upload</p>
                              <p className="text-sm text-secondary">Select a clear passport-style selfie.</p>
                            </div>
                            {selfieUploading ? <span className="text-xs font-bold text-primary">{selfieProgress}%</span> : null}
                          </div>
                          <label className="block cursor-pointer rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 hover:border-primary/40 transition-colors">
                            <input type="file" accept="image/*" className="hidden" onChange={handleSelfieChange} />
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-3xl text-secondary">person</span>
                              <div>
                                <p className="text-sm font-semibold">{selfieUploading ? 'Uploading selfie...' : 'Choose selfie image'}</p>
                                <p className="text-xs text-secondary">PNG, JPG, WEBP up to 10MB</p>
                              </div>
                            </div>
                          </label>
                          {selfieUrl ? (
                            <KycPreview
                              title="Selfie Preview"
                              url={selfieUrl}
                              kind="image"
                              onPreview={setPreview}
                            />
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-secondary">ID Document Upload</p>
                              <p className="text-sm text-secondary">Upload a photo or PDF of your identity document.</p>
                            </div>
                            {idUploading ? <span className="text-xs font-bold text-primary">{idProgress}%</span> : null}
                          </div>
                          <label className="block cursor-pointer rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 hover:border-primary/40 transition-colors">
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleDocumentChange} />
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-3xl text-secondary">badge</span>
                              <div>
                                <p className="text-sm font-semibold">{idUploading ? 'Uploading document...' : 'Choose document file'}</p>
                                <p className="text-xs text-secondary">Image or PDF up to 10MB</p>
                              </div>
                            </div>
                          </label>
                          {idDocumentUrl ? (
                            <KycPreview
                              title="ID Document Preview"
                              url={idDocumentUrl}
                              kind={getPreviewKind(idDocumentUrl, idDocumentFileType)}
                              onPreview={setPreview}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {formError ? <p className="text-error text-sm font-semibold">{formError}</p> : null}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="text-secondary text-sm font-semibold hover:text-primary transition-colors"
                    onClick={() => {
                      setFullLegalName(account?.name ?? '');
                      setAddress(kyc?.address ?? '');
                      setNationalId(kyc?.nationalId ?? '');
                      setSelfieUrl(kyc?.selfieUrl ?? '');
                      setIdDocumentUrl(kyc?.idDocumentUrl ?? '');
                      setFieldErrors({});
                      setFormError(null);
                    }}
                  >
                    Reset
                  </button>
                  <Button type="submit" disabled={submitting || selfieUploading || idUploading}>
                    {submitting ? 'Submitting...' : isRejected ? 'Resubmit KYC' : 'Submit KYC'}
                  </Button>
                </div>
              </form>
            ) : null}
            
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
    </LandlordPortalLayout>
  );
};

export default LandlordVerification;
