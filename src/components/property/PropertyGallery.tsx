import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Property } from '../../types';
import LocationMap from './map/LocationMap';
import { hasPropertyMap, propertyGallerySlideCount } from '../../utils/propertyGallery';

interface PropertyGalleryProps {
  property: Property;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  mediaSectionRef?: RefObject<HTMLDivElement | null>;
}

const PropertyGallery = ({ property, activeIndex, onActiveIndexChange, mediaSectionRef }: PropertyGalleryProps) => {
  const media = property.media ?? [];
  const mapAvailable = hasPropertyMap(property);
  const slideCount = propertyGallerySlideCount(property);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentIndex = slideCount ? ((activeIndex ?? internalActiveIndex) % slideCount + slideCount) % slideCount : 0;
  const isMap = mapAvailable && currentIndex === media.length;
  const activeMedia = media[currentIndex];
  const changeActiveIndex = useCallback((index: number) => onActiveIndexChange ? onActiveIndexChange(index) : setInternalActiveIndex(index), [onActiveIndexChange]);
  const selectSlide = useCallback((index: number) => {
    if (slideCount) changeActiveIndex((index + slideCount) % slideCount);
  }, [changeActiveIndex, slideCount]);
  const previous = () => selectSlide(currentIndex - 1);
  const next = () => selectSlide(currentIndex + 1);

  useEffect(() => {
    if (slideCount <= 1 || paused || isMap || lightboxOpen) return;
    const advance = window.setTimeout(() => selectSlide(currentIndex + 1), 3000);
    return () => window.clearTimeout(advance);
  }, [selectSlide, currentIndex, slideCount, paused, isMap, lightboxOpen]);

  useEffect(() => {
    const handleVisibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      // Arrow keys inside the interactive map belong to the map.
      if (event.target instanceof Element && event.target.closest('[data-gallery-map]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        selectSlide(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentIndex, selectSlide]);

  if (!slideCount) {
    return <div ref={mediaSectionRef} className="flex aspect-[16/9] items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-low"><div className="text-center text-secondary"><span className="material-symbols-outlined mb-2 block text-5xl">photo_library</span><p className="text-sm">No media uploaded for this property yet.</p></div></div>;
  }

  const renderMedia = (item: Property['media'][number], className: string, controls = false) => item.type === 'video'
    ? <video key={item.url} src={item.url} className={className} controls={controls} autoPlay={!controls} muted playsInline preload="metadata" />
    : <img src={item.url} alt={property.title} className={className} onError={(event) => { event.currentTarget.style.display = 'none'; }} />;
  const renderMap = () => <div data-gallery-map className="isolate h-full overflow-hidden rounded-xl"><LocationMap title={property.title} coordinates={property.coordinates!} /></div>;
  const thumbnailClass = (selected: boolean) => `relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selected ? 'scale-105 border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-90'}`;

  return (
    <div
      ref={mediaSectionRef}
      className="space-y-3"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || lightboxOpen) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (event.key === 'ArrowLeft') previous(); else next();
        }
      }}
      aria-label="Property media carousel"
    >
      <div className="group relative isolate h-[280px] sm:h-[400px] md:h-[560px]">
        {slideCount > 1 ? <button type="button" aria-label="Previous property media" onClick={previous} className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow backdrop-blur-sm"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button> : null}
        {isMap ? (
          <>
            {lightboxOpen ? <div className="h-full rounded-xl bg-surface-container-low" /> : renderMap()}
            <button type="button" aria-label="Expand property map" onClick={() => setLightboxOpen(true)} className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">
              <span aria-hidden="true" className="material-symbols-outlined text-sm">open_in_full</span>View Full
            </button>
          </>
        ) : (
          <div role="button" aria-label="Expand property media" tabIndex={0} className="relative h-full cursor-zoom-in overflow-hidden rounded-xl bg-surface-container-low" onClick={() => setLightboxOpen(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setLightboxOpen(true); } }}>
            {renderMedia(activeMedia, 'h-full w-full object-cover transition-transform duration-700 group-hover:scale-105')}
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            <span className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"><span aria-hidden="true" className="material-symbols-outlined text-sm">open_in_full</span>View Full</span>
          </div>
        )}
        <span className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">{currentIndex + 1} / {slideCount}{isMap ? ' \u00b7 Map' : ''}</span>
        {slideCount > 1 ? <button type="button" aria-label="Next property media" onClick={next} className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow backdrop-blur-sm"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button> : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Property media thumbnails">
        {media.map((item, index) => (
          <button key={item.public_id || item.url} type="button" role="tab" aria-label={`View property ${item.type} ${index + 1}`} aria-selected={index === currentIndex} onClick={() => selectSlide(index)} className={thumbnailClass(index === currentIndex)}>
            {item.type === 'video' ? <div className="flex h-full w-full items-center justify-center bg-surface-container-low"><span aria-hidden="true" className="material-symbols-outlined text-lg text-secondary">play_circle</span></div> : <img src={item.url} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />}
          </button>
        ))}
        {mapAvailable ? (
          <button type="button" role="tab" aria-label="View property map" aria-selected={isMap} onClick={() => selectSlide(media.length)} className={thumbnailClass(isMap)}>
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-container-low text-primary"><span aria-hidden="true" className="material-symbols-outlined text-xl">map</span><span className="text-xs font-bold">Map</span></span>
          </button>
        ) : null}
      </div>
      {lightboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-14 py-16 sm:px-20" role="dialog" aria-modal="true" aria-label="Property media viewer" onClick={() => setLightboxOpen(false)}>
          <button type="button" autoFocus aria-label="Close media viewer" className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
          {slideCount > 1 ? <button type="button" aria-label="Previous property media" className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:left-4" onClick={(event) => { event.stopPropagation(); previous(); }}><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button> : null}
          <div className="max-h-[80vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            {isMap ? <div className="h-[75vh]">{renderMap()}</div> : renderMedia(activeMedia, 'max-h-[80vh] w-full rounded-xl object-contain', true)}
          </div>
          {slideCount > 1 ? <button type="button" aria-label="Next property media" className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:right-4" onClick={(event) => { event.stopPropagation(); next(); }}><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button> : null}
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm font-bold text-white">{currentIndex + 1} / {slideCount}{isMap ? ' \u00b7 Map' : ''}</span>
        </div>
      ) : null}
    </div>
  );
};

export default PropertyGallery;
