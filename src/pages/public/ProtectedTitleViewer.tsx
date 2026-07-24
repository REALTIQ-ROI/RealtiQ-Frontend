import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { titleDocumentService } from '../../services/titleDocumentService';
import type { PaidAccessMode, ViewerSession } from '../../types';

interface ViewerRouteState {
  session: ViewerSession;
  documentId: string;
  propertyId: string;
  mode?: PaidAccessMode;
  returnPath?: string;
}

const ProtectedTitleViewer = () => {
  const location = useLocation();
  const state = location.state as ViewerRouteState | null;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(() =>
    state?.session.expiresAt ? new Date(state.session.expiresAt).getTime() <= Date.now() : false,
  );
  const expiresAt = state?.session.expiresAt;
  const watermark = state?.session.watermark;
  const watermarkText = useMemo(
    () => watermark ? `${watermark.heading} • ${watermark.viewer} • ${watermark.access} • ${watermark.property} • ${watermark.timestamp}` : '',
    [watermark],
  );

  useEffect(() => {
    if (!state?.session) return;
    let active = true;
    let currentUrl: string | null = null;
    titleDocumentService.fetchViewerContent(state.session.contentUrl)
      .then(({ blob, contentType: responseType }) => {
        if (!active) return;
        if (responseType !== 'application/pdf' && !responseType.startsWith('image/')) {
          throw new Error('This protected file type cannot be displayed.');
        }
        currentUrl = URL.createObjectURL(blob);
        setContentType(responseType);
        setObjectUrl(currentUrl);
      })
      .catch((raw) => {
        if (active) setError(raw instanceof Error ? raw.message : 'Unable to load protected content.');
      });
    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [state?.session]);

  useEffect(() => {
    if (!expiresAt) return;
    const delay = new Date(expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => {
      setExpired(true);
      setObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const propertyPath = state?.returnPath || (state?.propertyId ? `/properties/${state.propertyId}` : '/properties');

  return (
    <PublicLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Short-lived protected session</p>
            <h1 className="mt-1 text-2xl font-extrabold">RealtiQ title-document viewer</h1>
            {expiresAt ? <p className="mt-1 text-xs text-secondary">Session expires {new Date(expiresAt).toLocaleString()}.</p> : null}
          </div>
          <Link to={propertyPath} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Close viewer</Link>
        </div>
        {/* <p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Download and print controls are unavailable. These controls discourage casual copying, but browsers and operating systems cannot guarantee screenshot prevention.
        </p> */}
        {!state?.session ? (
          <div className="rounded-xl border border-outline-variant/20 p-8 text-center">
            <p className="font-bold">No active viewer session is available.</p>
            <p className="mt-2 text-sm text-secondary">Return to the property and check access before explicitly opening a new session. One-time access may already have been consumed.</p>
          </div>
        ) : expired ? (
          <div className="rounded-xl border border-outline-variant/20 p-8 text-center">
            <p className="font-bold">This protected viewer session has expired.</p>
            <Link to={propertyPath} className="mt-4 inline-block text-sm font-bold text-primary underline">Return to property</Link>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-800">{error}</div>
        ) : !objectUrl ? (
          <p className="rounded-xl bg-surface-container-low p-8 text-center text-sm text-secondary">Loading protected content…</p>
        ) : (
          <div
            className="relative min-h-[70vh] overflow-hidden rounded-xl bg-slate-900 p-2"
            onContextMenu={(event) => event.preventDefault()}
          >
            {contentType === 'application/pdf' ? (
              <iframe title="Protected title document" src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`} className="h-[78vh] w-full bg-white" />
            ) : (
              <img src={objectUrl} alt="Protected title document" className="mx-auto max-h-[78vh] max-w-full select-none object-contain" draggable={false} />
            )}
            <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-2 place-items-center overflow-hidden">
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className="-rotate-12 select-none px-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-700/25 sm:text-xs">
                  {watermarkText}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </PublicLayout>
  );
};

export default ProtectedTitleViewer;
