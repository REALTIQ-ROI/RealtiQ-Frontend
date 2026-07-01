import { useMemo, useState } from 'react';
import type { Property } from '../../types';

const PropertyGallery = ({ property }: { property: Property }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const media = useMemo(() => property.media ?? [], [property.media]);
  const activeMedia = media[activeIndex] ?? media[0];
  const sideMedia = media.filter((_, index) => index !== activeIndex).slice(0, 4);

  if (media.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-xl bg-surface-container-low flex items-center justify-center border border-outline-variant/10">
        <div className="text-center text-secondary">
          <span className="material-symbols-outlined text-5xl mb-2 block">photo_library</span>
          <p className="text-sm">No media uploaded for this property yet.</p>
        </div>
      </div>
    );
  }

  const renderMedia = (item?: Property['media'][number]) => {
    if (!item) return null;

    if (item.type === 'video') {
      return (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          controls
          playsInline
          preload="metadata"
        />
      );
    }

    return <img src={item.url} alt={property.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />;
  };

  return (
    <div className="space-y-3">
      <div className="grid h-[280px] grid-cols-12 gap-3 sm:h-[400px] md:h-[560px]">
        <div
          role="button"
          tabIndex={0}
          className="col-span-12 md:col-span-8 overflow-hidden rounded-xl bg-surface-container-low cursor-zoom-in relative group"
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightboxOpen(true);
            }
          }}
        >
          {renderMedia(activeMedia)}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <span className="absolute bottom-4 right-4 bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            View Full
          </span>
        </div>

        <div className="hidden md:grid md:col-span-4 grid-cols-2 gap-3">
          {sideMedia.map((item, idx) => (
            <button
              key={item.public_id}
              type="button"
              className="overflow-hidden rounded-xl bg-surface-container-low cursor-pointer relative group"
              onClick={() => setActiveIndex(media.indexOf(item))}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-black/5">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">play_circle</span>
                    <p className="text-[10px] uppercase tracking-widest text-secondary mt-1">Video</p>
                  </div>
                </div>
              ) : (
                <img src={item.url} alt={`${property.title} view ${idx + 2}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
          {media.length > 5 && (
            <button
              type="button"
              className="overflow-hidden rounded-xl bg-surface-container-low cursor-pointer relative group"
              onClick={() => setLightboxOpen(true)}
            >
              {renderMedia(media[5])}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-sm">+{media.length - 5} more</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {media.map((item, idx) => (
          <button
            key={item.public_id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              idx === activeIndex ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-90'
            }`}
          >
            {item.type === 'video' ? (
              <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-secondary">play_circle</span>
              </div>
            ) : (
              <img src={item.url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            )}
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((activeIndex - 1 + media.length) % media.length);
            }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-[85vh] w-full">
            {activeMedia?.type === 'video' ? (
              <video src={activeMedia.url} className="max-w-5xl max-h-[85vh] w-full rounded-xl" controls autoPlay />
            ) : (
              <img
                src={activeMedia?.url}
                alt={property.title}
                className="max-w-5xl max-h-[85vh] w-full object-contain rounded-xl"
              />
            )}
          </div>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((activeIndex + 1) % media.length);
            }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <p className="absolute bottom-4 text-white/60 text-sm">
            {activeIndex + 1} / {media.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;
