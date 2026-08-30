import { useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import Button from '../ui/Button';
import type { RegistryDocumentMatchResult } from '../../types';
import { isAllowedTitleMatchFile, shortenHash } from '../../utils/titleVerification';

interface DocumentMatchUploadProps {
  onVerify: (file: File) => Promise<RegistryDocumentMatchResult>;
  registeredHash?: string | null;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentMatchUpload = ({ onVerify, registeredHash }: DocumentMatchUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RegistryDocumentMatchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setResult(null);
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!isAllowedTitleMatchFile(selected)) {
      setFile(null);
      setError('Upload a PDF, JPEG, PNG, or WebP file for document matching.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Select a title document file to compare.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const next = await onVerify(file);
      setResult(next);
      toast[next.matches ? 'success' : 'error'](
        next.matches ? 'Uploaded file matches the registered title document.' : next.message || 'Uploaded file does not match.',
      );
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : 'Unable to verify the uploaded file.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadedHash = result?.uploadedDocumentHash ?? result?.documentHash;
  const registered = result?.registeredDocumentHash ?? registeredHash;

  return (
    <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Document Match Check</h2>
        <p className="mt-1 text-sm text-secondary">Compare one file against the SHA-256 hash RealtIQ recorded for this title verification.</p>
      </div>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-5 text-sm">
          <span className="block font-bold text-on-surface">Upload comparison file</span>
          <span className="mt-1 block text-xs text-secondary">PDF, JPEG, PNG, or WebP. The file is used only for this comparison request.</span>
          <input
            className="mt-4 block w-full text-sm"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={onFileChange}
          />
        </label>
        {file ? (
          <div className="rounded-lg bg-surface-container-low p-3 text-sm text-secondary">
            <strong className="text-on-surface">{file.name}</strong> · {file.type || 'Unknown type'} · {formatSize(file.size)}
          </div>
        ) : null}
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <Button type="submit" disabled={submitting || !file}>
          {submitting ? 'Checking...' : 'Check Document Match'}
        </Button>
      </form>
      {result ? (
        <div className={`mt-5 rounded-xl border p-4 ${result.matches ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
          <p className="font-bold">{result.matches ? 'File matches the reviewed title document.' : 'File does not match the reviewed title document.'}</p>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-bold uppercase tracking-widest opacity-70">Uploaded hash</dt>
              <dd className="mt-1 break-all font-mono">{shortenHash(uploadedHash, 18)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-widest opacity-70">Registered hash</dt>
              <dd className="mt-1 break-all font-mono">{shortenHash(registered, 18)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
};

export default DocumentMatchUpload;
