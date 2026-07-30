import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { getKycMediaKind } from '../../features/proxyNetwork/kycMedia';

interface AdminKycMediaViewerProps {
  title: string;
  url: string;
  mimeType?: string;
  onClose: () => void;
}

interface FileFallbackProps {
  url: string;
  download?: boolean;
}

const FileFallback = ({ url, download = false }: FileFallbackProps) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    download={download || undefined}
    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
  >
    {download ? 'Download file' : 'Open file'}
  </a>
);

const PdfPreview = ({ title, url, mimeType }: { title: string; url: string; mimeType?: string }) => {
  const [attempt, setAttempt] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let createdUrl: string | null = null;
    const load = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load document');
        const downloadedBlob = await response.blob();
        if (controller.signal.aborted) return;
        const contentType = downloadedBlob.type && downloadedBlob.type !== 'application/octet-stream'
          ? downloadedBlob.type
          : mimeType || 'application/pdf';
        const previewBlob = new Blob([downloadedBlob], { type: contentType === 'application/pdf' ? contentType : 'application/pdf' });
        createdUrl = URL.createObjectURL(previewBlob);
        setPreviewUrl(createdUrl);
      } catch (raw) {
        if (!controller.signal.aborted) {
          setError(raw instanceof Error ? raw.message : 'Unable to load document');
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attempt, mimeType, url]);

  if (error) {
    return <div className="rounded-xl bg-white p-8 text-center"><p role="alert" className="font-bold text-error">The secure PDF could not be loaded. Its signed URL may have expired or become inaccessible.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => { setError(''); setPreviewUrl(null); setAttempt((value) => value + 1); }} className="rounded-lg bg-surface-container-high px-4 py-2 text-sm font-bold">Retry preview</button><FileFallback url={url} download /></div></div>;
  }
  if (!previewUrl) {
    return <div className="flex h-[70vh] items-center justify-center rounded-xl bg-white" role="status"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />Loading secure PDF preview…</div>;
  }
  return <iframe src={previewUrl} className="h-[80vh] w-full rounded-xl bg-white" title={title} />;
};

const ImagePreview = ({ title, url }: { title: string; url: string }) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="rounded-xl bg-white p-8 text-center"><p role="alert" className="font-bold text-error">The secure image could not be loaded. Its signed URL may have expired.</p><div className="mt-5"><FileFallback url={url} /></div></div>;
  return <div className="relative flex min-h-64 items-center justify-center rounded-xl bg-white">{loading ? <p className="absolute text-sm text-secondary" role="status"><LoaderCircle className="mr-2 inline h-5 w-5 animate-spin" aria-hidden="true" />Loading image…</p> : null}<img src={url} alt={title} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} className={`max-h-[80vh] w-full rounded-xl object-contain ${loading ? 'opacity-0' : 'opacity-100'}`} /></div>;
};

const AdminKycMediaViewer = ({ title, url, mimeType = '', onClose }: AdminKycMediaViewerProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const kind = getKycMediaKind(mimeType, url);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openerRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-kyc-viewer-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-4 text-white">
          <h2 id="admin-kyc-viewer-title" className="text-sm font-semibold uppercase tracking-widest">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Close document viewer"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        {kind === 'image' ? <ImagePreview title={title} url={url} /> : null}
        {kind === 'pdf' ? <PdfPreview title={title} url={url} mimeType={mimeType} /> : null}
        {kind === 'word' ? <div className="rounded-xl bg-white p-8 text-center"><span className="material-symbols-outlined text-5xl text-secondary" aria-hidden="true">description</span><h3 className="mt-3 text-xl font-black">Word document</h3><p className="mt-2 text-sm text-secondary">Browsers cannot reliably preview DOC/DOCX files. Use the signed file action below.</p><div className="mt-5 flex justify-center"><FileFallback url={url} download /></div></div> : null}
        {kind === 'unsupported' ? <div className="rounded-xl bg-white p-8 text-center"><h3 className="text-xl font-black">Preview unavailable</h3><p className="mt-2 text-sm text-secondary">This file type is not supported for an in-app preview.</p><div className="mt-5 flex justify-center"><FileFallback url={url} /></div></div> : null}
      </div>
    </div>
  );
};

export default AdminKycMediaViewer;
