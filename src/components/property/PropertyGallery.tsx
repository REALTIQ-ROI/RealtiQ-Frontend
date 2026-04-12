import { useState } from 'react';
import type { Property } from '../../types';

const PropertyGallery = ({ property }: { property: Property }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = property.media.filter((m) => m.type === 'image');
  const mainImage = images[activeIndex] ?? images[0];
  const sideImages = images.filter((_, i) => i !== activeIndex).slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-3 h-[400px] md:h-[560px]">
        {/* Main image */}
        <div
          className="col-span-12 md:col-span-8 overflow-hidden rounded-xl bg-surface-container-low cursor-zoom-in relative group"
          onClick={() => setLightboxOpen(true)}
        >
          <img src={mainImage?.url} alt={property.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <span className="absolute bottom-4 right-4 bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            View Full
          </span>
        </div>

        {/* Side images grid */}
        <div className="hidden md:grid md:col-span-4 grid-cols-2 gap-3">
          {sideImages.slice(0, 4).map((item, idx) => (
            <div
              key={item.public_id}
              className="overflow-hidden rounded-xl bg-surface-container-low cursor-pointer relative group"
              onClick={() => setActiveIndex(images.indexOf(item))}
            >
              <img src={item.url} alt={`${property.title} view ${idx + 2}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
          {/* "View all" overlay on the last tile if there are more than 5 images */}
          {images.length > 5 && (
            <div
              className="overflow-hidden rounded-xl bg-surface-container-low cursor-pointer relative group"
              onClick={() => setLightboxOpen(true)}
            >
              <img src={images[5]?.url} alt="more views" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-sm">+{images.length - 5} more</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {images.map((item, idx) => (
          <button
            key={item.public_id}
            onClick={() => setActiveIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              idx === activeIndex ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-90'
            }`}
          >
            <img src={item.url} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setActiveIndex((activeIndex - 1 + images.length) % images.length); }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <img
            src={mainImage?.url}
            alt={property.title}
            className="max-w-5xl max-h-[85vh] w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setActiveIndex((activeIndex + 1) % images.length); }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <p className="absolute bottom-4 text-white/60 text-sm">{activeIndex + 1} / {images.length}</p>
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;
