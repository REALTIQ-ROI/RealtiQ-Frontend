export const ZOOM_VIDEO_SDK_VERSION = '2.6.10';

export interface ZoomParticipant {
  userId: number;
  displayName: string;
  isOnHold?: boolean;
  bVideoOn?: boolean;
}

export interface ZoomVideoStream {
  startVideo(): Promise<unknown>;
  stopVideo(): Promise<unknown>;
  startAudio(): Promise<unknown>;
  stopAudio(): Promise<unknown>;
  isAudioMuted(): boolean;
  muteAudio(): Promise<unknown>;
  unmuteAudio(): Promise<unknown>;
  attachVideo(userId: number, quality: number): Promise<HTMLElement | { type?: string; reason?: string }>;
  detachVideo(userId: number): Promise<HTMLElement | HTMLElement[]>;
}

export interface ZoomVideoClient {
  init(language: string, dependentAssets: string, options?: { patchJsMedia?: boolean; leaveOnPageUnload?: boolean }): Promise<unknown>;
  join(topic: string, token: string, userName: string): Promise<unknown>;
  leave(end?: boolean): Promise<unknown>;
  getMediaStream(): ZoomVideoStream;
  getAllUser(): ZoomParticipant[];
  getOnHoldUsers(): ZoomParticipant[];
  isHost(): boolean;
  isManager(): boolean;
  isHoldEnabled(): boolean;
  isUserOnHold(): boolean;
  enableHold(enabled: boolean): Promise<unknown>;
  admit(userId: number): Promise<unknown>;
  on(event: string, listener: (payload: unknown) => void): void;
  off(event: string, listener: (payload: unknown) => void): void;
}

export interface ZoomVideoSdk {
  VERSION?: string;
  VideoQuality: { Video_720P: number };
  createClient(): ZoomVideoClient;
  destroyClient(): Promise<void>;
  checkSystemRequirements(): { audio: boolean; video: boolean };
}

declare global {
  interface Window {
    WebVideoSDK?: ZoomVideoSdk;
  }
}

let sdkPromise: Promise<ZoomVideoSdk> | null = null;

/** Load Zoom's versioned Video SDK bundle only when someone actually joins a tour. */
export const loadZoomVideoSdk = (): Promise<ZoomVideoSdk> => {
  if (window.WebVideoSDK) return Promise.resolve(window.WebVideoSDK);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<ZoomVideoSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://source.zoom.us/videosdk/zoom-video-${ZOOM_VIDEO_SDK_VERSION}.min.js`;
    script.async = true;
    script.dataset.realtiqZoomVideoSdk = ZOOM_VIDEO_SDK_VERSION;
    script.onload = () => {
      if (!window.WebVideoSDK) {
        sdkPromise = null;
        script.remove();
        reject(new Error('The Zoom Video SDK did not initialize. Reload the page and try again.'));
        return;
      }
      resolve(window.WebVideoSDK);
    };
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error('The Zoom Video SDK could not be loaded. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
};

/** Read the signed token claims locally to catch mismatched/expired server responses before joining. */
export const inspectVideoSdkSignature = (signature: string, expectedSdkKey: string): { expiresAt?: number } => {
  const payloadPart = signature.split('.')[1];
  if (!payloadPart) throw new Error('The backend returned an invalid Video SDK signature.');

  try {
    const base64 = payloadPart.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { app_key?: unknown; exp?: unknown };
    if (claims.app_key !== expectedSdkKey) throw new Error('The backend Video SDK key does not match its signed session token.');
    if (typeof claims.exp !== 'number') throw new Error('The backend Video SDK token is missing its expiry.');
    return { expiresAt: claims.exp };
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not match')) throw error;
    throw new Error('The backend returned an invalid Video SDK signature.');
  }
};
