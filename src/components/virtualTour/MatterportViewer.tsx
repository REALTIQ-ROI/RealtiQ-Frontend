import { useEffect, useRef, useState } from 'react';
import type { MpSdk } from '@matterport/sdk';
import type { VirtualViewerProps } from './viewerTypes';

interface MatterportSubscription { cancel(): void }
interface MatterportRoomData { id: string; label: string; floorInfo: { id: string; sequence: number }; center: { x: number; y: number; z: number } }

const MatterportViewer = ({
  modelSid,
  sdkKey,
  showcaseUrl,
  mode,
  rooms,
  floors,
  selectedRoom,
  selectedFloor,
  measurementsEnabled,
  floorPlanEnabled,
  tagsEnabled,
  guidedTourEnabled,
  onError,
}: VirtualViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<MpSdk | null>(null);
  const subscriptionsRef = useRef<MatterportSubscription[]>([]);
  const sdkRoomsRef = useRef<Record<string, MatterportRoomData>>({});
  const [readyVersion, setReadyVersion] = useState(0);
  const [tourAvailable, setTourAvailable] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [mattertags, setMattertags] = useState<Array<{ sid: string; label: string }>>([]);

  useEffect(() => {
    if (!modelSid || !sdkKey || !containerRef.current) return;
    let active = true;
    const host = containerRef.current;
    const subscriptions = subscriptionsRef.current;
    const initialize = async () => {
      try {
        const { setupSdk } = await import('@matterport/sdk');
        const showcase = showcaseUrl ? new URL(showcaseUrl) : null;
        const iframeQueryParams = new URLSearchParams(showcase?.search ?? '');
        iframeQueryParams.delete('m');
        iframeQueryParams.delete('key');
        iframeQueryParams.set('play', '1');
        iframeQueryParams.set('qs', '1');
        const sdk = await setupSdk(sdkKey, {
          space: modelSid,
          container: host,
          ...(showcase?.hostname === 'my.matterportvr.cn' ? { domain: showcase.hostname } : {}),
          iframeAttributes: { title: 'Matterport virtual tour', allow: 'fullscreen; xr-spatial-tracking', class: 'h-full w-full border-0' },
          iframeQueryParams,
        });
        if (!active) { host.replaceChildren(); return; }
        sdkRef.current = sdk;
        setReadyVersion((value) => value + 1);
        subscriptionsRef.current.push(sdk.Room.data.subscribe({
          onCollectionUpdated: (collection) => { sdkRoomsRef.current = collection; },
        }));
        if (guidedTourEnabled) {
          void sdk.Tour.getData().then((snapshots) => { if (active) setTourAvailable(snapshots.length > 0); }).catch(() => undefined);
        }
        if (tagsEnabled) {
          void sdk.Mattertag.getData().then((tags) => { if (active) setMattertags(tags.map((tag) => ({ sid: tag.sid, label: tag.label || 'Mattertag' }))); }).catch(() => undefined);
        }
      } catch (error) {
        if (active) onError(error instanceof Error ? error.message : 'Matterport could not initialize in this browser.');
      }
    };
    void initialize();
    return () => {
      active = false;
      subscriptions.splice(0).forEach((subscription) => subscription.cancel());
      sdkRef.current = null;
      sdkRoomsRef.current = {};
      host.replaceChildren();
    };
  }, [guidedTourEnabled, modelSid, onError, sdkKey, showcaseUrl, tagsEnabled]);

  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;
    const target = mode === 'tour'
      ? sdk.Mode.Mode.INSIDE
      : mode === 'model'
        ? sdk.Mode.Mode.DOLLHOUSE
        : floorPlanEnabled ? sdk.Mode.Mode.FLOORPLAN : sdk.Mode.Mode.INSIDE;
    void sdk.Mode.moveTo(target).catch(() => undefined);
    if (measurementsEnabled) void sdk.Measurements.toggleMode(mode === 'measurements').catch(() => undefined);
  }, [floorPlanEnabled, measurementsEnabled, mode, readyVersion]);

  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk || !selectedFloor) return;
    const floor = floors.find((item) => item.id === selectedFloor);
    const sequence = typeof floor?.level === 'number' ? floor.level : Number(floor?.level);
    if (Number.isFinite(sequence)) void sdk.Floor.moveTo(sequence).catch(() => undefined);
  }, [floors, selectedFloor, readyVersion]);

  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk || !selectedRoom) return;
    const room = rooms.find((item) => item.id === selectedRoom);
    const sdkRoom = room ? sdkRoomsRef.current[room.providerReference] : undefined;
    if (!sdkRoom) return;
    void sdk.Mode.moveTo(sdk.Mode.Mode.FLOORPLAN)
      .then(() => sdk.Floor.moveTo(sdkRoom.floorInfo.sequence))
      .then(() => sdk.Camera.lookAt(sdkRoom.center))
      .catch(() => undefined);
  }, [rooms, selectedRoom, readyVersion]);

  const toggleTour = async () => {
    const sdk = sdkRef.current;
    if (!sdk) return;
    try {
      if (tourPlaying) await sdk.Tour.stop(); else await sdk.Tour.start();
      setTourPlaying(!tourPlaying);
    } catch { onError('The Matterport Highlight Reel could not be started.'); }
  };

  return <div className="relative h-full w-full bg-black" data-testid="matterport-viewer">
    <div ref={containerRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    {(tourAvailable || mattertags.length > 0) ? <div className="absolute bottom-14 right-3 z-10 flex max-w-[70%] flex-wrap gap-2 rounded-lg bg-black/65 p-2">
      {tourAvailable ? <button type="button" className="rounded bg-white px-3 py-1 text-xs font-bold text-primary" onClick={() => void toggleTour()}>{tourPlaying ? 'Stop guided tour' : 'Play guided tour'}</button> : null}
      {mattertags.length > 0 ? <select aria-label="Matterport tags" className="rounded bg-white px-2 py-1 text-xs" defaultValue="" onChange={(event) => { const sdk = sdkRef.current; if (sdk && event.target.value) void sdk.Mattertag.navigateToTag(event.target.value, sdk.Mattertag.Transition.FLY).catch(() => undefined); }}><option value="">Explore tags</option>{mattertags.map((tag) => <option key={tag.sid} value={tag.sid}>{tag.label}</option>)}</select> : null}
    </div> : null}
  </div>;
};

export default MatterportViewer;
