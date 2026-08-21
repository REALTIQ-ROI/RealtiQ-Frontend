import type { NormalizedFloor, NormalizedRoom } from '../../types/virtualTour';

export type VirtualViewerMode = 'tour' | 'model' | 'floorplan' | 'measurements';

export interface VirtualViewerProps {
  workDataUrl?: string;
  modelSid?: string;
  sdkKey?: string;
  showcaseUrl?: string;
  mode: VirtualViewerMode;
  rooms: NormalizedRoom[];
  floors: NormalizedFloor[];
  selectedRoom?: string;
  selectedFloor?: string;
  measurementsEnabled: boolean;
  measurementUnit?: 'm' | 'ft' | 'mm';
  floorPlanEnabled: boolean;
  tagsEnabled: boolean;
  guidedTourEnabled: boolean;
  onError: (message: string) => void;
}
