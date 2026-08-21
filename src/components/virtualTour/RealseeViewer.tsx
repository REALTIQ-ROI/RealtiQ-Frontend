import { useEffect, useRef, useState } from 'react';
import type { Five as FiveInstance } from '@realsee/five';
import type { VirtualViewerProps } from './viewerTypes';

interface Disposable { dispose(): void }

const RealseeViewer = ({
  workDataUrl,
  mode,
  rooms,
  selectedRoom,
  selectedFloor,
  measurementsEnabled,
  measurementUnit,
  floorPlanEnabled,
  tagsEnabled,
  guidedTourEnabled,
  onError,
}: VirtualViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fiveRef = useRef<FiveInstance | null>(null);
  const measureRef = useRef<(Disposable & { measure(): void; endMeasure(): void }) | null>(null);
  const pluginsRef = useRef<Disposable[]>([]);
  const floorPlanPluginRef = useRef<Disposable | null>(null);
  const tagPluginRef = useRef<Disposable | null>(null);
  const cruisePluginRef = useRef<(Disposable & { playFromStart(options?: { userAction?: boolean }): void; pause(options?: { userAction?: boolean }): void }) | null>(null);
  const [readyVersion, setReadyVersion] = useState(0);
  const [guidedTourPlaying, setGuidedTourPlaying] = useState(false);

  useEffect(() => {
    if (!workDataUrl || !containerRef.current) return;
    let active = true;
    const controller = new AbortController();
    const host = containerRef.current;
    const plugins = pluginsRef.current;

    const initialize = async () => {
      try {
        const [{ Five, parseWork }] = await Promise.all([
          import('@realsee/five'),
          import('three'),
        ]);
        const response = await fetch(workDataUrl, { signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('The signed Realsee Work URL could not be loaded.');
        const raw: unknown = await response.json();
        if (!active) return;
        const work = parseWork(raw);
        const five = new Five({ poweredByRealsee: true });
        fiveRef.current = five;
        five.appendTo(host);
        await five.load(work, 'initial');
        if (!active) { five.dispose(); return; }
        setReadyVersion((value) => value + 1);

      } catch (error) {
        if (active && !controller.signal.aborted) {
          onError(error instanceof Error ? error.message : 'Realsee could not initialize in this browser.');
        }
      }
    };

    void initialize();
    const resizeObserver = new ResizeObserver(([entry]) => {
      const five = fiveRef.current;
      if (five) five.refresh({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    resizeObserver.observe(host);

    return () => {
      active = false;
      controller.abort();
      resizeObserver.disconnect();
      plugins.splice(0).forEach((plugin) => plugin.dispose());
      floorPlanPluginRef.current = null;
      tagPluginRef.current = null;
      cruisePluginRef.current = null;
      measureRef.current = null;
      fiveRef.current?.dispose();
      fiveRef.current = null;
      host.replaceChildren();
    };
  }, [onError, workDataUrl]);

  useEffect(() => {
    const five = fiveRef.current;
    if (!five) return;
    const nextMode = mode === 'tour' ? 'Panorama' : mode === 'model' ? 'Model' : 'Floorplan';
    void five.changeMode(nextMode).catch(() => undefined);
    if (mode === 'measurements') measureRef.current?.measure();
    else measureRef.current?.endMeasure();
  }, [mode, readyVersion]);

  useEffect(() => {
    if (!measurementsEnabled || measureRef.current || !fiveRef.current) return;
    let active = true;
    import('@realsee/dnalogel/libs/MeasurePlugin').then(({ MeasurePlugin }) => {
      if (!active || !fiveRef.current) return;
      const plugin = MeasurePlugin(fiveRef.current, { unit: measurementUnit ?? 'm' });
      measureRef.current = plugin;
      pluginsRef.current.push(plugin);
      if (mode === 'measurements') plugin.measure();
    }).catch(() => onError('The Realsee measurement plugin could not initialize.'));
    return () => { active = false; };
  }, [measurementUnit, measurementsEnabled, mode, onError, readyVersion]);

  useEffect(() => {
    if (!tagsEnabled || tagPluginRef.current || !fiveRef.current) return;
    let active = true;
    import('@realsee/dnalogel/libs/PanoTagPlugin').then(({ PanoTagPlugin }) => {
      if (!active || !fiveRef.current) return;
      const plugin = PanoTagPlugin(fiveRef.current);
      tagPluginRef.current = plugin;
      pluginsRef.current.push(plugin);
    }).catch(() => onError('The Realsee tag plugin could not initialize.'));
    return () => { active = false; };
  }, [onError, readyVersion, tagsEnabled]);

  useEffect(() => {
    if (mode !== 'floorplan' || !floorPlanEnabled || floorPlanPluginRef.current || !fiveRef.current) return;
    let active = true;
    import('@realsee/dnalogel/libs/floorplan/ModelFloorplanPlugin').then(({ ModelFloorplanPlugin }) => {
      if (!active || !fiveRef.current) return;
      const plugin = ModelFloorplanPlugin(fiveRef.current, {});
      floorPlanPluginRef.current = plugin;
      pluginsRef.current.push(plugin);
    }).catch(() => onError('The Realsee floor-plan plugin could not initialize.'));
    return () => { active = false; };
  }, [floorPlanEnabled, mode, onError, readyVersion]);

  useEffect(() => {
    if (!guidedTourEnabled || cruisePluginRef.current || !fiveRef.current) return;
    let active = true;
    import('@realsee/dnalogel/libs/CruisePlugin').then(({ CruisePlugin }) => {
      if (!active || !fiveRef.current) return;
      const plugin = CruisePlugin(fiveRef.current, {});
      cruisePluginRef.current = plugin;
      pluginsRef.current.push(plugin);
    }).catch(() => onError('The Realsee guided-tour plugin could not initialize.'));
    return () => { active = false; };
  }, [guidedTourEnabled, onError, readyVersion]);

  useEffect(() => {
    if (!selectedRoom) return;
    const room = rooms.find((item) => item.id === selectedRoom);
    if (room) void fiveRef.current?.moveToPano(room.providerReference as `${string}[${number}]`).catch(() => undefined);
  }, [rooms, selectedRoom]);

  useEffect(() => {
    if (!selectedFloor) return;
    const room = rooms.find((item) => String(item.floor) === selectedFloor);
    if (room) void fiveRef.current?.moveToPano(room.providerReference as `${string}[${number}]`).catch(() => undefined);
  }, [rooms, selectedFloor]);

  const toggleGuidedTour = () => {
    const plugin = cruisePluginRef.current;
    if (!plugin) return;
    if (guidedTourPlaying) plugin.pause({ userAction: true });
    else plugin.playFromStart({ userAction: true });
    setGuidedTourPlaying((playing) => !playing);
  };

  return <div className="relative h-full w-full bg-black" data-testid="realsee-viewer">
    <div ref={containerRef} className="h-full w-full overflow-hidden [&>canvas]:h-full [&>canvas]:w-full" />
    {guidedTourEnabled ? <button type="button" className="absolute bottom-14 right-3 z-10 rounded bg-white px-3 py-2 text-xs font-bold text-primary" onClick={toggleGuidedTour}>{guidedTourPlaying ? 'Pause guided tour' : 'Play guided tour'}</button> : null}
  </div>;
};

export default RealseeViewer;
