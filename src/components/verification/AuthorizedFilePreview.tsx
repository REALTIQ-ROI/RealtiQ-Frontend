interface AuthorizedFilePreviewProps {
  url: string;
  mimeType: string;
  alt: string;
}

/** Renders only bytes already fetched through an authorized private-content route. */
const AuthorizedFilePreview = ({ url, mimeType, alt }: AuthorizedFilePreviewProps) => {
  const normalizedMimeType = mimeType.toLowerCase().split(';', 1)[0].trim();

  if (normalizedMimeType.startsWith('image/')) {
    return <img src={url} alt={alt} className="mx-auto h-full max-h-full max-w-full object-contain" />;
  }

  if (normalizedMimeType === 'application/pdf') {
    // An empty sandbox disables Chrome's built-in PDF viewer and produces a blocked-page frame.
    return <iframe title={alt} src={url} className="h-full w-full rounded border bg-white" />;
  }

  return <div role="status" className="flex h-full flex-col items-center justify-center gap-3 rounded border bg-surface-container-low p-6 text-center">
    <p className="text-sm text-secondary">This file type cannot be previewed in the browser.</p>
    <a href={url} download className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Download authorized file</a>
  </div>;
};

export default AuthorizedFilePreview;
