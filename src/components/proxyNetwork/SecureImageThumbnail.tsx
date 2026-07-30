import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

interface SecureImageThumbnailProps {
  src: string;
  alt: string;
  onClick?: () => void;
  className?: string;
}

const SecureImageThumbnail = ({ src, alt, onClick, className = 'h-44 w-full' }: SecureImageThumbnailProps) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const content = failed ? (
    <span className="flex h-full w-full flex-col items-center justify-center bg-surface-container-high p-3 text-center text-xs text-secondary">
      <span className="material-symbols-outlined mb-1" aria-hidden="true">broken_image</span>
      Image unavailable
    </span>
  ) : (
    <>
      {loading ? <span className="absolute inset-0 flex items-center justify-center text-xs text-secondary"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading image…</span> : null}
      <img src={src} alt={alt} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} className={`h-full w-full object-cover ${loading ? 'opacity-0' : 'opacity-100'}`} />
    </>
  );
  const classes = `relative overflow-hidden rounded-xl bg-surface-container-low ${className}`;
  return onClick && !failed ? <button type="button" onClick={onClick} className={`${classes} text-left focus:outline-none focus:ring-2 focus:ring-primary`} aria-label={`View ${alt}`}>{content}</button> : <div className={classes}>{content}</div>;
};

export default SecureImageThumbnail;
