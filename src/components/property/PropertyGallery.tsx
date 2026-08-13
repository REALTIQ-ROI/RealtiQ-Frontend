import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { Property } from '../../types';

interface PropertyGalleryProps {
  property: Property;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  mediaSectionRef?: RefObject<HTMLDivElement | null>;
}

const PropertyGallery = ({ property, activeIndex, onActiveIndexChange, mediaSectionRef }: PropertyGalleryProps) => {
  const media = useMemo(() => property.media ?? [], [property.media]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentIndex = activeIndex ?? internalActiveIndex;
  const changeActiveIndex = useCallback((index: number) => onActiveIndexChange ? onActiveIndexChange(index) : setInternalActiveIndex(index), [onActiveIndexChange]);
  const activeMedia = media[currentIndex] ?? media[0];

  useEffect(() => {
    if (media.length <= 1 || paused) return;
    const advance = window.setTimeout(() => {
      changeActiveIndex((currentIndex + 1) % media.length);
    }, 3000);
    return () => window.clearTimeout(advance);
  }, [changeActiveIndex, currentIndex, media.length, paused]);

  useEffect(() => {
    const handleVisibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const selectMedia = (index: number) => changeActiveIndex((index + media.length) % media.length);
  const previous = () => selectMedia(currentIndex - 1);
  const next = () => selectMedia(currentIndex + 1);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (media.length === 0) {
    return <div ref={mediaSectionRef} className="flex aspect-[16/9] items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-low"><div className="text-center text-secondary"><span className="material-symbols-outlined mb-2 block text-5xl">photo_library</span><p className="text-sm">No media uploaded for this property yet.</p></div></div>;
  }

  const renderMedia = (item: Property['media'][number], className: string, controls = false) => item.type === 'video'
    ? <video key={item.url} src={item.url} className={className} controls={controls} autoPlay={!controls} muted playsInline preload="metadata" onError={() => undefined} />
    : <img src={item.url} alt={property.title} className={className} onError={(event) => { event.currentTarget.style.display = 'none'; }} />;

  return <div ref={mediaSectionRef} className="space-y-3" tabIndex={0} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'ArrowLeft') previous(); if (event.target === event.currentTarget && event.key === 'ArrowRight') next(); }} aria-label="Property media carousel">
    <div className="group relative h-[280px] sm:h-[400px] md:h-[560px]">
      <button type="button" aria-label="Previous property media" onClick={previous} className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100"><span className="material-symbols-outlined">chevron_left</span></button>
      <div role="button" tabIndex={0} className="relative h-full cursor-zoom-in overflow-hidden rounded-xl bg-surface-container-low" onClick={() => setLightboxOpen(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setLightboxOpen(true); } }}>
        {renderMedia(activeMedia, 'h-full w-full object-cover transition-transform duration-700 group-hover:scale-105')}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        <span className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"><span className="material-symbols-outlined text-sm">open_in_full</span>View Full</span>
        <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white">{currentIndex + 1} / {media.length}</span>
      </div>
      <button type="button" aria-label="Next property media" onClick={next} className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100"><span className="material-symbols-outlined">chevron_right</span></button>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Property media thumbnails">{media.map((item, index) => <button key={item.public_id || item.url} type="button" role="tab" aria-label={`View property ${item.type} ${index + 1}`} aria-selected={index === currentIndex} onClick={() => selectMedia(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${index === currentIndex ? 'scale-105 border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-90'}`}>{item.type === 'video' ? <div className="flex h-full w-full items-center justify-center bg-surface-container-low"><span className="material-symbols-outlined text-lg text-secondary">play_circle</span></div> : <img src={item.url} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />}</button>)}</div>
    {lightboxOpen ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Property media viewer" onClick={() => setLightboxOpen(false)}>
      <button type="button" aria-label="Close media viewer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}><span className="material-symbols-outlined">close</span></button>
      <button type="button" aria-label="Previous property media" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white" onClick={(event) => { event.stopPropagation(); previous(); }}><span className="material-symbols-outlined">chevron_left</span></button>
      <div className="max-h-[85vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>{renderMedia(activeMedia, 'max-h-[85vh] w-full rounded-xl object-contain', true)}</div>
      <button type="button" aria-label="Next property media" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white" onClick={(event) => { event.stopPropagation(); next(); }}><span className="material-symbols-outlined">chevron_right</span></button>
    </div> : null}
  </div>;
};

export default PropertyGallery;
