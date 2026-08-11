import { useMemo, useState } from 'react';
import type { ProjectMedia } from '../../types';

const mediaKey = (item: ProjectMedia, index: number) => item.public_id || `${item.url}-${index}`;

const ProjectMediaGallery = ({ media = [], title }: { media?: ProjectMedia[]; title: string }) => {
  const orderedMedia = useMemo(() => {
    const items = [...media];
    const coverIndex = items.findIndex((item) => item.isCover);
    if (coverIndex > 0) {
      const [cover] = items.splice(coverIndex, 1);
      items.unshift(cover);
    }
    return items;
  }, [media]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeMedia = orderedMedia[activeIndex] ?? orderedMedia[0];
  const sideMedia = orderedMedia.filter((_, index) => index !== activeIndex).slice(0, 4);

  if (!orderedMedia.length) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-low">
        <div className="text-center text-secondary">
          <span className="material-symbols-outlined mb-2 block text-5xl">photo_library</span>
          <p className="text-sm">No project media has been uploaded yet.</p>
        </div>
      </div>
    );
  }

  const renderMedia = (item?: ProjectMedia, className = 'h-full w-full object-cover') => {
    if (!item) return null;
    if (item.type === 'video') {
      return <video src={item.url} className={className} controls playsInline preload="metadata" />;
    }
    return <img src={item.url} alt={item.caption || title} className={className} />;
  };

  return (
    <div className="space-y-3">
      <div className="grid h-[300px] grid-cols-12 gap-3 sm:h-[440px] lg:h-[560px]">
        <div
          role="button"
          tabIndex={0}
          className="group relative col-span-12 cursor-zoom-in overflow-hidden rounded-xl bg-surface-container-low lg:col-span-8"
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightboxOpen(true);
            }
          }}
        >
          {renderMedia(activeMedia)}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          <span className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            View full
          </span>
        </div>

        <div className="hidden grid-cols-2 gap-3 lg:grid lg:col-span-4">
          {sideMedia.map((item, index) => (
            <button
              key={mediaKey(item, index)}
              type="button"
              onClick={() => setActiveIndex(orderedMedia.indexOf(item))}
              className="group relative overflow-hidden rounded-xl bg-surface-container-low"
              aria-label={`View ${title} media ${orderedMedia.indexOf(item) + 1}`}
            >
              {item.type === 'video' ? (
                <div className="flex h-full w-full items-center justify-center bg-black/5">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">play_circle</span>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Video</p>
                  </div>
                </div>
              ) : (
                <img src={item.url} alt={item.caption || `${title} view ${index + 2}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            </button>
          ))}
          {orderedMedia.length > 5 ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative overflow-hidden rounded-xl bg-surface-container-low"
            >
              {renderMedia(orderedMedia[5])}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-sm font-bold text-white">+{orderedMedia.length - 5} more</span>
              </div>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {orderedMedia.map((item, index) => (
          <button
            key={mediaKey(item, index)}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
              index === activeIndex ? 'scale-105 border-primary' : 'border-transparent opacity-60 hover:opacity-90'
            }`}
            aria-label={`Select ${title} media ${index + 1}`}
          >
            {item.type === 'video' ? (
              <div className="flex h-full w-full items-center justify-center bg-surface-container-low">
                <span className="material-symbols-outlined text-lg text-secondary">play_circle</span>
              </div>
            ) : (
              <img src={item.url} alt={item.caption || `${title} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>

      {activeMedia?.caption ? <p className="text-sm text-secondary">{activeMedia.caption}</p> : null}

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxOpen(false)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20" onClick={() => setLightboxOpen(false)} aria-label="Close project media viewer">
            <span className="material-symbols-outlined">close</span>
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((activeIndex - 1 + orderedMedia.length) % orderedMedia.length);
            }}
            aria-label="Previous project media"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="max-h-[85vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            {renderMedia(activeMedia, 'max-h-[85vh] w-full rounded-xl object-contain')}
          </div>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex((activeIndex + 1) % orderedMedia.length);
            }}
            aria-label="Next project media"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <p className="absolute bottom-4 text-sm text-white/60">{activeIndex + 1} / {orderedMedia.length}</p>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectMediaGallery;
