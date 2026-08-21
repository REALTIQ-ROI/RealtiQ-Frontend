import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FloorPlanResponse, MeasurementsResponse, PropertyVirtualTourResponse, RoomsResponse, VirtualTourSummary } from '../../types/virtualTour';
import { virtualTourService } from '../../services/virtualTourService';
import LoadingState from '../ui/LoadingState';
import type { VirtualViewerMode } from './viewerTypes';

const RealseeViewer = lazy(() => import('./RealseeViewer'));
const MatterportViewer = lazy(() => import('./MatterportViewer'));
type DisplayMode = 'photos' | VirtualViewerMode;

interface Props {
  propertyId: string;
  summary?: VirtualTourSummary;
  onPhotosSelected: () => void;
}

const statusMessage = (summary: VirtualTourSummary) => {
  const preferred = summary.preferredProvider ? summary.providers[summary.preferredProvider] : null;
  const providerStates = [preferred, summary.providers.realsee, summary.providers.matterport].filter(Boolean);
  if (providerStates.some((provider) => provider?.status === 'processing')) return 'This digital twin is still processing. Please try again later.';
  if (providerStates.some((provider) => provider?.status === 'failed')) return 'The digital twin could not be prepared. The property owner can review its configuration.';
  if (providerStates.some((provider) => provider?.status === 'disabled')) return 'The configured virtual-tour provider is currently disabled.';
  return 'A virtual tour is not available for this property.';
};

const VirtualTourExperience = ({ propertyId, summary, onPhotosSelected }: Props) => {
  const [mode, setMode] = useState<DisplayMode>('photos');
  const [modalOpen, setModalOpen] = useState(false);
  const [tour, setTour] = useState<PropertyVirtualTourResponse | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlanResponse | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementsResponse | null>(null);
  const [rooms, setRooms] = useState<RoomsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerRetryVersion, setViewerRetryVersion] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const requestId = useRef(0);
  const currentPropertyId = useRef(propertyId);
  currentPropertyId.current = propertyId;

  useEffect(() => {
    setMode('photos');
    setModalOpen(false);
    setTour(null);
    setFloorPlan(null);
    setMeasurements(null);
    setRooms(null);
    setError(null);
    setViewerError(null);
    setViewerRetryVersion(0);
    requestId.current += 1;
  }, [propertyId]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setMode('photos');
    setSelectedRoom('');
    setSelectedFloor('');
    setViewerError(null);
    if (document.fullscreenElement === wrapperRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousOverflow) document.body.style.overflow = previousOverflow;
      else document.body.style.removeProperty('overflow');
      if (document.fullscreenElement === wrapperRef.current) void document.exitFullscreen().catch(() => undefined);
      openerRef.current?.focus();
    };
  }, [closeModal, modalOpen]);

  const loadTour = useCallback(async (force = false) => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    setViewerError(null);
    try {
      const result = await virtualTourService.getPropertyVirtualTour(propertyId, force);
      if (current === requestId.current) setTour(result);
    } catch (raw) {
      if (current === requestId.current) setError(raw instanceof Error ? raw.message : 'Unable to load the virtual tour.');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [propertyId]);

  const selectMode = async (next: DisplayMode) => {
    if (next === 'photos') {
      closeModal();
      onPhotosSelected();
      return;
    }
    if (!modalOpen) openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMode(next);
    setModalOpen(true);
    if (!tour) await loadTour();
    if (next === 'floorplan' && !floorPlan) {
      setModeLoading(true);
      try {
        const result = await virtualTourService.getPropertyVirtualTourFloorPlan(propertyId);
        if (currentPropertyId.current === propertyId) setFloorPlan(result);
      }
      catch (raw) { if (currentPropertyId.current === propertyId) setError(raw instanceof Error ? raw.message : 'Unable to load floor-plan data.'); }
      finally { if (currentPropertyId.current === propertyId) setModeLoading(false); }
    }
    if (next === 'measurements' && !measurements) {
      setModeLoading(true);
      try {
        const result = await virtualTourService.getPropertyVirtualTourMeasurements(propertyId);
        if (currentPropertyId.current === propertyId) setMeasurements(result);
      }
      catch (raw) { if (currentPropertyId.current === propertyId) setError(raw instanceof Error ? raw.message : 'Unable to start measurements.'); }
      finally { if (currentPropertyId.current === propertyId) setModeLoading(false); }
    }
  };

  const loadRooms = async () => {
    if (rooms) return;
    setModeLoading(true);
    try {
      const result = await virtualTourService.getPropertyVirtualTourRooms(propertyId);
      if (currentPropertyId.current === propertyId) setRooms(result);
    }
    catch (raw) { if (currentPropertyId.current === propertyId) setError(raw instanceof Error ? raw.message : 'Unable to load rooms.'); }
    finally { if (currentPropertyId.current === propertyId) setModeLoading(false); }
  };

  const tabs = useMemo(() => {
    const items: Array<{ id: DisplayMode; label: string }> = [{ id: 'photos', label: 'Photos & Videos' }];
    if (summary?.available && (summary.capabilities.panorama || summary.capabilities.model3D)) items.push({ id: 'tour', label: '3D Tour' });
    if (summary?.capabilities.model3D) items.push({ id: 'model', label: 'Dollhouse' });
    if (summary?.capabilities.floorPlan) items.push({ id: 'floorplan', label: 'Floor Plan' });
    if (summary?.capabilities.measurements) items.push({ id: 'measurements', label: 'Measurements' });
    return items;
  }, [summary]);

  const resolvedRooms = rooms?.available ? rooms.rooms : floorPlan?.available ? floorPlan.rooms : [];
  const resolvedFloors = rooms?.available ? rooms.floors : floorPlan?.available ? floorPlan.floors : [];
  const renderable = tour?.available && tour.status === 'ready' ? tour.viewer : null;
  const floorPlanEnabled = mode !== 'floorplan' || Boolean(floorPlan?.available && (
    floorPlan.provider === 'realsee' || floorPlan.viewerFloorPlan
  ));
  const measurementsEnabled = mode !== 'measurements' || Boolean(measurements?.available);
  const modeRenderable = floorPlanEnabled && measurementsEnabled;
  const measurementUnit: 'm' | 'ft' | 'mm' | undefined = measurements?.available && measurements.provider === 'realsee'
    ? (measurements.unit === 'ft' || measurements.unit === 'mm' ? measurements.unit : 'm')
    : undefined;
  const viewerProps = {
    mode: mode === 'photos' ? 'tour' as const : mode,
    rooms: resolvedRooms,
    floors: resolvedFloors,
    selectedRoom,
    selectedFloor,
    measurementsEnabled: Boolean(tour?.capabilities.measurements && measurements?.available),
    measurementUnit,
    floorPlanEnabled: Boolean(floorPlan?.available),
    tagsEnabled: Boolean(tour?.capabilities.tags),
    guidedTourEnabled: Boolean(tour?.capabilities.guidedTour),
    onError: setViewerError,
  };

  return (
    <section className="space-y-4" aria-label="Virtual tour">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => void selectMode(tab.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${mode === tab.id ? 'bg-primary text-white' : 'bg-surface-container-low text-primary'}`}>{tab.label}</button>)}
        {summary?.capabilities.panorama || summary?.capabilities.model3D ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">3D Tour Available</span> : null}
        {summary?.capabilities.floorPlan ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Floor Plan Available</span> : null}
        {summary?.capabilities.measurements ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Measurements Available</span> : null}
        {summary?.fallbackUsed ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Preferred provider unavailable — fallback active</span> : null}
      </div>

      {modalOpen && mode !== 'photos' ? <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="virtual-tour-modal-title"
        onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}
      >
        <div ref={wrapperRef} className="flex h-full max-h-screen w-full max-w-7xl flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-[92vh] sm:max-h-[900px] sm:rounded-2xl fullscreen:h-screen fullscreen:max-h-none fullscreen:max-w-none fullscreen:rounded-none" data-testid="virtual-tour-wrapper">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-3 py-3 text-white sm:px-5">
            <div className="min-w-0">
              <h2 id="virtual-tour-modal-title" className="truncate text-base font-black sm:text-xl">Virtual Tour</h2>
              <div className="mt-2 flex max-w-[calc(100vw-5rem)] gap-2 overflow-x-auto pb-1 sm:max-w-none sm:flex-wrap">
                {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => void selectMode(tab.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${mode === tab.id ? 'bg-white text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`} aria-pressed={mode === tab.id}>{tab.label}</button>)}
              </div>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeModal} className="shrink-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close virtual tour">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>
          <div className="relative min-h-0 flex-1">
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          {tour?.capabilities.roomLabels ? <button type="button" className="rounded-lg bg-black/65 px-3 py-2 text-xs font-bold text-white" onClick={() => void loadRooms()}>Rooms</button> : null}
          <button type="button" className="rounded-lg bg-black/65 px-3 py-2 text-xs font-bold text-white" onClick={() => { if (wrapperRef.current) void wrapperRef.current.requestFullscreen().catch(() => undefined); }}>Fullscreen</button>
        </div>
        {(resolvedFloors.length > 0 || resolvedRooms.length > 0) ? <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2 rounded-lg bg-black/65 p-2">
          {resolvedFloors.length > 0 ? <select aria-label="Choose floor" value={selectedFloor} onChange={(event) => setSelectedFloor(event.target.value)} className="rounded bg-white px-2 py-1 text-xs"><option value="">Choose floor</option>{resolvedFloors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select> : null}
          {resolvedRooms.length > 0 ? <select aria-label="Choose room" value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)} className="rounded bg-white px-2 py-1 text-xs"><option value="">Choose room</option>{resolvedRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select> : null}
        </div> : null}
        <div className="h-full min-h-[320px]">
          {loading || modeLoading ? <div className="flex h-full items-center justify-center bg-white"><LoadingState label="Loading virtual tour..." /></div> : null}
          {!loading && error ? <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white"><p>{error}</p><button type="button" className="rounded-lg bg-white px-4 py-2 font-bold text-primary" onClick={() => void loadTour(true)}>Retry</button></div> : null}
          {!loading && !error && viewerError ? <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white"><p>{viewerError}</p><button type="button" className="rounded-lg bg-white px-4 py-2 font-bold text-primary" onClick={() => { setViewerError(null); setViewerRetryVersion((value) => value + 1); }}>Try again</button></div> : null}
          {!loading && !error && !viewerError && tour?.status === 'temporarily_unavailable' ? <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white"><p>{tour.error?.message ?? 'Virtual tour provider is temporarily unavailable.'}</p><button type="button" className="rounded-lg bg-white px-4 py-2 font-bold text-primary" onClick={() => void loadTour(true)}>Retry</button></div> : null}
          {!loading && !error && !viewerError && tour && !tour.available ? <div className="flex h-full items-center justify-center p-6 text-center text-white"><p>{statusMessage(tour)}</p></div> : null}
          {!loading && !error && !viewerError && mode === 'floorplan' && floorPlan && !floorPlan.available ? <div className="flex h-full items-center justify-center p-6 text-center text-white">A floor plan is not available for this digital twin.</div> : null}
          {!loading && !error && !viewerError && mode === 'floorplan' && floorPlan?.available && floorPlan.provider === 'matterport' && !floorPlan.viewerFloorPlan ? <div className="flex h-full items-center justify-center p-6 text-center text-white">Interactive floor-plan mode is not available for this Matterport space.</div> : null}
          {!loading && !error && !viewerError && mode === 'measurements' && measurements && !measurements.available ? <div className="flex h-full items-center justify-center p-6 text-center text-white">Measurements are not available for this digital twin.</div> : null}
          {!loading && !error && !viewerError && tour?.available && tour.status === 'ready' && !tour.viewer ? <div className="flex h-full items-center justify-center p-6 text-center text-white">The virtual tour is ready, but its viewer configuration is incomplete.</div> : null}
          {!loading && !error && !viewerError && renderable?.provider === 'realsee' && !renderable.configuration.workDataUrl ? <div className="flex h-full items-center justify-center p-6 text-center text-white">Realsee is configured, but its signed Work URL is missing. Ask the property manager to complete setup.</div> : null}
          {!loading && !error && !viewerError && renderable?.provider === 'matterport' && !renderable.configuration.sdkKey ? <div className="flex h-full items-center justify-center p-6 text-center text-white">Matterport is configured, but the public domain-restricted SDK key is missing.</div> : null}
          {!loading && !error && !viewerError && modeRenderable && renderable?.provider === 'realsee' && renderable.configuration.workDataUrl ? <Suspense fallback={<LoadingState label="Loading Realsee viewer..." />}><RealseeViewer key={`realsee-${viewerRetryVersion}`} {...viewerProps} workDataUrl={renderable.configuration.workDataUrl} /></Suspense> : null}
          {!loading && !error && !viewerError && modeRenderable && renderable?.provider === 'matterport' && renderable.configuration.sdkKey ? <Suspense fallback={<LoadingState label="Loading Matterport viewer..." />}><MatterportViewer key={`matterport-${viewerRetryVersion}`} {...viewerProps} modelSid={renderable.configuration.modelSid} showcaseUrl={renderable.configuration.showcaseUrl} sdkKey={renderable.configuration.sdkKey} /></Suspense> : null}
        </div>
          </div>
          {mode === 'floorplan' && floorPlan?.available && floorPlan.provider === 'matterport' ? <div className="max-h-32 shrink-0 overflow-y-auto bg-white p-4 text-sm"><p className="font-bold">Interactive viewer floor plan</p><p className="text-secondary">No purchased schematic floor plan is included.</p>{floorPlan.data?.floorPlanAssets.map((asset) => <a key={asset.url} className="mt-2 inline-block font-bold text-primary underline" href={asset.url} target="_blank" rel="noreferrer">Open returned floor-plan image ({asset.floor.label})</a>)}</div> : null}
          {mode === 'measurements' && measurements?.available && measurements.provider === 'realsee' && measurements.measurements?.length ? <div className="max-h-32 shrink-0 overflow-y-auto bg-white p-4 text-sm"><p className="font-bold">Saved provider measurements ({measurements.unit ?? 'm'})</p><ul>{measurements.measurements.map((item) => <li key={item.id}>{item.id}: {item.value} {measurements.unit ?? 'm'}</li>)}</ul></div> : null}
        </div>
      </div> : null}
      {!summary?.available && mode === 'photos' ? <p className="text-sm text-secondary">{summary ? statusMessage(summary) : 'Virtual-tour availability has not been provided for this listing.'}</p> : null}
    </section>
  );
};

export default VirtualTourExperience;
