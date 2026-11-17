export interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleLatLngPoint {
  lat(): number;
  lng(): number;
}

export interface GoogleMapBounds {
  getNorthEast(): GoogleLatLngPoint;
  getSouthWest(): GoogleLatLngPoint;
  contains(position: GoogleLatLngLiteral): boolean;
  extend(position: GoogleLatLngLiteral): GoogleMapBounds;
}

export interface GoogleMapInstance {
  fitBounds(bounds: GoogleMapBounds, padding?: number): void;
  getBounds(): GoogleMapBounds | undefined;
  getZoom(): number | undefined;
  setZoom(zoom: number): void;
  panTo(position: GoogleLatLngLiteral): void;
  getDiv(): HTMLElement;
  getProjection(): { fromLatLngToContainerPixel(position: GoogleLatLngLiteral | GoogleLatLngPoint): { x: number; y: number } | null } | undefined;
  addListener(eventName: string, listener: () => void): { remove(): void };
}

export interface GoogleMarker {
  setMap(map: GoogleMapInstance | null): void;
  addListener(eventName: string, listener: () => void): { remove(): void };
}

export interface GoogleInfoWindow {
  open(options: { map: GoogleMapInstance; anchor: GoogleMarker }): void;
}

export interface GoogleMapsApi {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  InfoWindow: new (options: { content: HTMLElement }) => GoogleInfoWindow;
  LatLngBounds: new () => GoogleMapBounds;
  LatLng: new (lat: number, lng: number) => GoogleLatLngPoint;
  SymbolPath: { CIRCLE: string };
  event: { clearInstanceListeners(instance: object): void; trigger(instance: object, eventName: string): void };
}

interface GoogleWindow extends Window {
  google?: { maps?: GoogleMapsApi };
}

let sdkPromise: Promise<GoogleMapsApi> | null = null;

export const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

export const loadGoogleMapsSdk = (): Promise<GoogleMapsApi> => {
  const browser = window as GoogleWindow;
  if (browser.google?.maps) return Promise.resolve(browser.google.maps);
  if (!googleMapsApiKey) return Promise.reject(new Error('Google Maps is not configured for this deployment.'));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existing = document.getElementById('realtiq-google-maps-sdk') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const complete = () => {
      const maps = browser.google?.maps;
      if (maps) resolve(maps);
      else {
        script.remove();
        reject(new Error('Google Maps could not be initialized.'));
      }
    };
    script.addEventListener('load', complete, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Google Maps could not be loaded.'));
    }, { once: true });
    if (!existing) {
      script.id = 'realtiq-google-maps-sdk';
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&loading=async&v=weekly`;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
};

