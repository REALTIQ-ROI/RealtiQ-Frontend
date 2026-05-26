import type { MediaItem } from '../../types';

interface MediaPreviewProps {
  media?: MediaItem | null;
  alt: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

const MediaPreview = ({
  media,
  alt,
  className = '',
  controls = false,
  muted = true,
  playsInline = true,
  preload = 'metadata',
}: MediaPreviewProps) => {
  if (!media) {
    return (
      <div className={`${className} flex items-center justify-center bg-surface-container-low`}>
        <span className="material-symbols-outlined text-secondary/40">photo_library</span>
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <video
        src={media.url}
        className={className}
        controls={controls}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
      />
    );
  }

  return <img src={media.url} alt={alt} className={className} />;
};

export default MediaPreview;
