import { useCallback, useEffect, useRef, useState } from 'react';
import { tourService } from '../../services/tourService';
import { inspectVideoSdkSignature, loadZoomVideoSdk, type ZoomParticipant, type ZoomVideoClient, type ZoomVideoSdk, type ZoomVideoStream } from '../../services/zoomVideoSdk';

type SessionState = 'loading' | 'waiting' | 'connected' | 'reconnecting' | 'failed' | 'ended';
type ConnectionPayload = { state?: string; reason?: string };
type HoldPayload = { isOnHold?: boolean };
type VideoPayload = { state?: string; userId?: number };
type PermissionPayload = { name?: string; state?: string };

interface LiveGuidedVideoSessionProps {
  tourId: string;
  profileId: string;
  tourApproved?: boolean;
  onClose: () => void;
}

const readableRole = (role: string | number) => typeof role === 'number' ? (role === 1 ? 'Host' : 'Participant') : role.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const errorMessage = (raw: unknown, fallback: string) => raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : fallback;
const looksLikePermissionError = (raw: unknown) => /permission|forbidden|notallowed|not allowed|denied|camera|microphone|audio input/i.test(errorMessage(raw, ''));
const looksLikeExpiredToken = (raw: unknown, expiresAt?: number) => {
  if (expiresAt !== undefined && expiresAt <= Date.now() / 1000 + 10) return true;
  return /token.{0,20}expir|expir.{0,20}token|invalid.{0,20}(signature|token)|verify jwt|session_fetch_info_error/i.test(errorMessage(raw, ''));
};

export default function LiveGuidedVideoSession({ tourId, profileId, tourApproved, onClose }: LiveGuidedVideoSessionProps) {
  const [state, setState] = useState<SessionState>('loading');
  const stateRef = useRef<SessionState>(state);
  stateRef.current = state;
  const [error, setError] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [displayRole, setDisplayRole] = useState('');
  const [actualRole, setActualRole] = useState<'host' | 'manager' | 'participant'>('participant');
  const [holdEnabled, setHoldEnabled] = useState(false);
  const [onHoldUsers, setOnHoldUsers] = useState<ZoomParticipant[]>([]);
  const [participants, setParticipants] = useState<ZoomParticipant[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [microphoneMuted, setMicrophoneMuted] = useState(true);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [admittingId, setAdmittingId] = useState<number | null>(null);
  const [reconnectBusy, setReconnectBusy] = useState(false);

  const clientRef = useRef<ZoomVideoClient | null>(null);
  const streamRef = useRef<ZoomVideoStream | null>(null);
  const sdkRef = useRef<ZoomVideoSdk | null>(null);
  const signatureRef = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const closing = useRef(false);
  const connectedContainerHost = useRef<HTMLDivElement | null>(null);
  const videoPlayerContainer = useRef<HTMLElement | null>(null);
  const videoElements = useRef(new Map<number, HTMLElement>());
  const eventHandlers = useRef<Array<{ event: string; listener: (payload: unknown) => void }>>([]);
  const audioStarted = useRef(false);
  const cameraStarted = useRef(false);
  const admissionVerified = useRef(false);

  const setCurrentRole = useCallback((client: ZoomVideoClient) => {
    const isHost = client.isHost();
    const isManager = client.isManager();
    setActualRole(isHost ? 'host' : isManager ? 'manager' : 'participant');
    setHoldEnabled(client.isHoldEnabled());
  }, []);

  const refreshSessionLists = useCallback((client: ZoomVideoClient) => {
    setCurrentRole(client);
    try { setParticipants(client.getAllUser().filter((user) => !user.isOnHold)); } catch { setParticipants([]); }
    if (client.isHost() || client.isManager()) {
      try { setOnHoldUsers(client.getOnHoldUsers()); } catch { setOnHoldUsers([]); }
    } else {
      setOnHoldUsers([]);
    }
  }, [setCurrentRole]);

  const detachVideo = useCallback(async (userId: number) => {
    const stream = streamRef.current;
    if (!stream) return;
    try {
      const elements = await stream.detachVideo(userId);
      (Array.isArray(elements) ? elements : [elements]).forEach((element) => element.remove());
    } catch { /* The SDK may already have detached a player during failover. */ }
    videoElements.current.delete(userId);
  }, []);

  const pauseLocalMedia = useCallback(async () => {
    const stream = streamRef.current;
    if (stream && cameraStarted.current) {
      try { await stream.stopVideo(); } catch { /* The SDK may already have stopped the camera. */ }
    }
    if (stream && audioStarted.current) {
      try { await stream.stopAudio(); } catch { /* The SDK may already have stopped audio. */ }
    }
    cameraStarted.current = false;
    audioStarted.current = false;
    setCameraOn(false);
    setAudioOn(false);
    setMicrophoneMuted(true);
  }, []);

  const attachVideo = useCallback(async (userId: number) => {
    const stream = streamRef.current;
    const sdk = sdkRef.current;
    const container = videoPlayerContainer.current;
    if (!stream || !sdk || !container || videoElements.current.has(userId)) return;
    try {
      const element = await stream.attachVideo(userId, sdk.VideoQuality.Video_720P);
      if (!(element instanceof HTMLElement)) {
        setNotice('Zoom could not render this camera stream. The session audio and controls remain available.');
        return;
      }
      if (videoPlayerContainer.current !== container || stateRef.current === 'reconnecting' || stateRef.current === 'waiting' || stateRef.current === 'ended') {
        await detachVideo(userId);
        return;
      }
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.objectFit = 'cover';
      container.appendChild(element);
      videoElements.current.set(userId, element);
    } catch {
      setNotice('A participant video could not be rendered. The session can continue.');
    }
  }, [detachVideo]);

  const teardown = useCallback(async (leaveSession: boolean) => {
    const client = clientRef.current;
    const sdk = sdkRef.current;
    if (client) {
      eventHandlers.current.forEach(({ event, listener }) => client.off(event, listener));
      eventHandlers.current = [];
      if (leaveSession) {
        try { await client.leave(); } catch { /* The session may already have closed. */ }
      }
      const stream = streamRef.current;
      if (stream) {
        await Promise.all([...videoElements.current.keys()].map((userId) => detachVideo(userId)));
        try { await stream.stopVideo(); } catch { /* Camera may already be stopped. */ }
        try { await stream.stopAudio(); } catch { /* Audio may not have been started. */ }
      }
    }
    clientRef.current = null;
    streamRef.current = null;
    sdkRef.current = null;
    videoPlayerContainer.current = null;
    signatureRef.current = null;
    audioStarted.current = false;
    cameraStarted.current = false;
    admissionVerified.current = false;
    if (sdk) {
      try { await sdk.destroyClient(); } catch { /* SDK teardown is best-effort after leaving. */ }
    }
  }, [detachVideo]);

  const currentProfileMatches = useCallback(() => Boolean(profileId && localStorage.getItem('activeProfileId') === profileId), [profileId]);

  const setVideoPlayerContainer = useCallback((container: HTMLElement | null) => {
    videoPlayerContainer.current = container;
  }, []);

  const requestFreshToken = useCallback(async () => {
    if (!currentProfileMatches()) throw new Error('Your selected profile changed. Refresh this page before joining the live tour.');
    const response = await tourService.getVideoSessionToken(tourId, profileId);
    if (!currentProfileMatches()) throw new Error('Your selected profile changed while access was being prepared. Request access again from the current profile.');
    if (!response.sdkKey?.trim() || !response.signature?.trim() || !response.sessionName?.trim() || !response.userName?.trim()) {
      throw new Error('The backend returned incomplete live-video access details. Refresh the tour status or contact support.');
    }
    // The web join method consumes the signed token; its app_key claim must match this returned SDK key.
    const signatureInfo = inspectVideoSdkSignature(response.signature, response.sdkKey);
    signatureRef.current = response.signature;
    setDisplayRole(typeof response.role === 'string' || typeof response.role === 'number' ? readableRole(response.role) : 'Unspecified');
    return { ...response, expiresAt: signatureInfo.expiresAt };
  }, [currentProfileMatches, profileId, tourId]);

  const bindSdkEvents = useCallback((client: ZoomVideoClient) => {
    const on = (event: string, listener: (payload: unknown) => void) => {
      client.on(event, listener);
      eventHandlers.current.push({ event, listener });
    };

    on('connection-change', (raw) => {
      if (closing.current) return;
      const payload = raw as ConnectionPayload;
      if (payload.state === 'Connected') {
        if (client.isUserOnHold()) {
          void pauseLocalMedia();
          setState('waiting');
          setNotice('You are in the waiting room. The seller or assigned partner will admit you.');
        } else if (!admissionVerified.current) {
          setState('loading');
          setNotice('Confirming the server-configured admission controls…');
        } else {
          setState('connected');
          setNotice(payload.reason === 'on hold' ? 'You have been admitted to the live tour.' : '');
          refreshSessionLists(client);
        }
      } else if (payload.state === 'Reconnecting') {
        setState(client.isUserOnHold() ? 'waiting' : 'reconnecting');
        if (client.isUserOnHold()) void pauseLocalMedia();
        setNotice(payload.reason === 'on hold' ? 'You have been admitted and are reconnecting into the tour…' : 'The Video SDK is reconnecting. It will retry automatically.');
        setVideoPlayerContainer(null);
        void Promise.all([...videoElements.current.keys()].map((userId) => detachVideo(userId)));
      } else if (payload.state === 'Closed') {
        setState('ended');
        void pauseLocalMedia();
        void Promise.all([...videoElements.current.keys()].map((userId) => detachVideo(userId)));
        setError(payload.reason === 'ended by host' ? 'The seller or assigned partner ended this live tour.' : 'This live-video session has ended.');
        setVideoPlayerContainer(null);
      } else if (payload.state === 'Fail') {
        setState('failed');
        void pauseLocalMedia();
        void Promise.all([...videoElements.current.keys()].map((userId) => detachVideo(userId)));
        setError('The Video SDK could not reconnect. Requesting a fresh token and reconnecting may restore the session.');
      }
    });

    on('on-hold-change', (raw) => {
      if (closing.current) return;
      const payload = raw as HoldPayload;
      if (payload.isOnHold) {
        void pauseLocalMedia();
        setState('waiting');
        setNotice('You are in the waiting room. The seller or assigned partner will admit you.');
      } else {
        setState('reconnecting');
        setNotice('You have been admitted. Reconnecting into the live tour…');
      }
      refreshSessionLists(client);
    });

    const refreshLists = () => { if (!closing.current) refreshSessionLists(client); };
    on('user-added', refreshLists);
    on('user-updated', refreshLists);
    on('user-removed', refreshLists);

    on('video-active-change', (raw) => {
      const payload = raw as VideoPayload;
      if (typeof payload.userId !== 'number') return;
      if (payload.state === 'Active') void attachVideo(payload.userId);
      else if (payload.state === 'Inactive') void detachVideo(payload.userId);
    });

    on('device-permission-change', (raw) => {
      const payload = raw as PermissionPayload;
      if (payload.state === 'denied') setPermissionMessage(`Allow ${payload.name === 'camera' ? 'camera' : 'microphone'} access in your browser settings, then try again.`);
      else if (payload.state === 'granted') setPermissionMessage('');
    });

    on('active-media-failed', (raw) => {
      const payload = raw as { code?: number; message?: string; type?: string };
      if ([103, 203].includes(payload.code ?? -1)) {
        setPermissionMessage(payload.message || 'Allow camera or microphone access in your browser settings, then try again.');
      } else if (payload.message) {
        setNotice(payload.message);
      }
    });

    on('auto-play-audio-failed', () => setNotice('Click Enable microphone or another session control to let your browser start audio playback.'));
  }, [attachVideo, detachVideo, pauseLocalMedia, refreshSessionLists, setVideoPlayerContainer]);

  const beginJoin = useCallback(async () => {
    const attempt = ++requestVersion.current;
    closing.current = false;
    admissionVerified.current = false;
    setState('loading');
    setError('');
    setPermissionMessage('');
    setNotice('Loading the secure Video SDK session…');
    setDisplayRole('');
    setCameraOn(false);
    setAudioOn(false);
    setMicrophoneMuted(true);

    try {
      if (!currentProfileMatches()) throw new Error('Select the profile that is authorized for this viewing, then try again.');
      if (tourApproved === false) throw new Error('The seller must approve this booking before either participant can join.');
      const currentSession = await tourService.getVideoSession(tourId, profileId);
      if (attempt !== requestVersion.current) return;
      if (currentSession.state === 'ended') {
        setState('ended');
        setError('This live-video session has ended. Return to the tour card or partner job to review its current status.');
        setNotice('');
        return;
      }
      if (currentSession.joinAvailable !== true) {
        throw new Error(currentSession.lastErrorCode
          ? `The backend has not made this live-video session available to join: ${currentSession.lastErrorCode.replaceAll('_', ' ').toLowerCase()}.`
          : 'The backend has not made this live-video session available to join. Refresh the tour or partner-job status and try again.');
      }
      const sdk = await loadZoomVideoSdk();
      if (attempt !== requestVersion.current) return;
      const support = sdk.checkSystemRequirements();
      if (!support.audio || !support.video) throw new Error('This browser does not support the required audio and video features. Try a current version of Chrome, Edge, Firefox or Safari.');
      sdkRef.current = sdk;

      const client = sdk.createClient();
      clientRef.current = client;
      bindSdkEvents(client);
      await client.init('en-US', 'Global', { patchJsMedia: true, leaveOnPageUnload: true });
      if (attempt !== requestVersion.current) return;

      let joined = false;
      let latestToken: Awaited<ReturnType<typeof requestFreshToken>> | null = null;
      for (let tokenAttempt = 0; tokenAttempt < 2 && !joined; tokenAttempt += 1) {
        latestToken = await requestFreshToken();
        if (attempt !== requestVersion.current) return;
        if (latestToken.expiresAt !== undefined && latestToken.expiresAt <= Date.now() / 1000 + 10) {
          if (tokenAttempt === 0) continue;
          throw new Error('The live-video token expired before the session could start. Try joining again for a fresh token.');
        }
        try {
          await client.join(latestToken.sessionName, latestToken.signature, latestToken.userName);
          joined = true;
        } catch (raw) {
          if (tokenAttempt === 0 && looksLikeExpiredToken(raw, latestToken.expiresAt)) continue;
          throw raw;
        }
      }
      if (!joined || !latestToken) throw new Error('The live-video session could not be joined. Request fresh access and try again.');
      if (attempt !== requestVersion.current) return;

      const stream = client.getMediaStream();
      streamRef.current = stream;
      refreshSessionLists(client);
      if (client.isUserOnHold()) {
        admissionVerified.current = true;
        setState('waiting');
        setNotice('You are in the waiting room. The seller or assigned partner will admit you.');
        return;
      }

      if (client.isHost() && !client.isHoldEnabled()) {
        try {
          await client.enableHold(true);
        } catch {
          closing.current = true;
          try { await client.leave(); } catch { /* The backend hold configuration may have already closed the session. */ }
          closing.current = false;
          setState('failed');
          setError('Admission hold is not configured for this session. The backend must issue the host token with Zoom hold support before buyers can join.');
          return;
        }
      } else if (!client.isHost() && !client.isManager() && !client.isHoldEnabled()) {
        closing.current = true;
        try { await client.leave(); } catch { /* A missing waiting room must not leave a buyer connected. */ }
        closing.current = false;
        setState('failed');
        setError('This session is missing buyer admission hold. You were disconnected for privacy; ask the seller or assigned partner to refresh the live-tour setup.');
        return;
      }

      setHoldEnabled(client.isHoldEnabled());
      admissionVerified.current = true;
      setState('connected');
      setNotice('Camera and microphone start only when you turn them on. Recording is off.');
      window.setTimeout(() => {
        if (attempt !== requestVersion.current || stateRef.current !== 'connected') return;
        client.getAllUser().filter((user) => user.bVideoOn && !user.isOnHold).forEach((user) => void attachVideo(user.userId));
      }, 0);
    } catch (raw) {
      if (attempt !== requestVersion.current) return;
      setState('failed');
      setError(errorMessage(raw, 'The live-video session could not be joined. Refresh the session status and try again.'));
      setNotice('');
    }
  }, [attachVideo, bindSdkEvents, currentProfileMatches, refreshSessionLists, requestFreshToken, tourApproved, tourId, profileId]);

  useEffect(() => {
    const current = connectedContainerHost.current;
    if (!current || state !== 'connected') return;
    const container = document.createElement('video-player-container');
    container.className = 'grid min-h-64 w-full grid-cols-1 gap-3 sm:grid-cols-2';
    current.appendChild(container);
    setVideoPlayerContainer(container);
    const client = clientRef.current;
    if (client) {
      client.getAllUser().filter((user) => user.bVideoOn && !user.isOnHold).forEach((user) => void attachVideo(user.userId));
    }
    return () => {
      setVideoPlayerContainer(null);
      container.remove();
    };
  }, [attachVideo, setVideoPlayerContainer, state]);

  useEffect(() => {
    void beginJoin();
    return () => {
      requestVersion.current += 1;
      closing.current = true;
      void teardown(true);
    };
  }, [beginJoin, teardown]);

  const leaveSession = async () => {
    closing.current = true;
    requestVersion.current += 1;
    setState('loading');
    await teardown(true);
    onClose();
  };

  const reconnect = async () => {
    if (reconnectBusy) return;
    setReconnectBusy(true);
    closing.current = true;
    await teardown(true);
    closing.current = false;
    setReconnectBusy(false);
    void beginJoin();
  };

  const toggleCamera = async () => {
    const stream = streamRef.current;
    if (!stream || state !== 'connected' || mediaBusy) return;
    setMediaBusy(true);
    try {
      if (cameraOn) { await stream.stopVideo(); cameraStarted.current = false; setCameraOn(false); }
      else { await stream.startVideo(); cameraStarted.current = true; setCameraOn(true); setPermissionMessage(''); }
    } catch (raw) {
      if (looksLikePermissionError(raw)) setPermissionMessage(errorMessage(raw, 'Allow camera access in your browser settings, then try again.'));
      else setError(errorMessage(raw, 'The camera could not be started. Check that it is not in use by another app.'));
    } finally { setMediaBusy(false); }
  };

  const toggleMicrophone = async () => {
    const stream = streamRef.current;
    if (!stream || state !== 'connected' || mediaBusy) return;
    setMediaBusy(true);
    try {
      if (!audioStarted.current) {
        await stream.startAudio();
        audioStarted.current = true;
        setAudioOn(true);
        if (stream.isAudioMuted()) await stream.unmuteAudio();
      } else if (stream.isAudioMuted()) await stream.unmuteAudio();
      else await stream.muteAudio();
      setMicrophoneMuted(stream.isAudioMuted());
      setPermissionMessage('');
    } catch (raw) {
      if (looksLikePermissionError(raw)) setPermissionMessage(errorMessage(raw, 'Allow microphone access in your browser settings, then try again.'));
      else setError(errorMessage(raw, 'The microphone could not be started. Check your browser audio settings and try again.'));
    } finally { setMediaBusy(false); }
  };

  const admit = async (userId: number) => {
    const client = clientRef.current;
    if (!client || !(client.isHost() || client.isManager()) || admittingId !== null) return;
    setAdmittingId(userId);
    try {
      await client.admit(userId);
      setNotice('Participant admitted to the live tour.');
      refreshSessionLists(client);
    } catch (raw) {
      setError(errorMessage(raw, 'The participant could not be admitted. Refresh the waiting list and try again.'));
    } finally { setAdmittingId(null); }
  };

  const inSession = state === 'connected';
  const waiting = state === 'waiting';
  const roleLabel = actualRole === 'host' ? 'Host' : actualRole === 'manager' ? 'Manager' : 'Participant';
  const statusLabel: Record<SessionState, string> = {
    loading: 'Joining live guided tour…',
    waiting: 'Waiting for admission',
    connected: 'Connected',
    reconnecting: 'Reconnecting to the live tour…',
    failed: 'Could not join the live tour',
    ended: 'Live tour ended',
  };

  return <div className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-black/70 p-3 sm:p-6" role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Live guided video tour" className="my-auto w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">RealtiQ · live guided tour</p>
          <h2 className="mt-1 text-xl font-black">{statusLabel[state]}</h2>
          <p className="mt-1 text-xs text-secondary">Tour {tourId}</p>
        </div>
        <button type="button" aria-label="Leave live guided tour" className="rounded-lg border px-3 py-2 text-sm font-bold" onClick={() => void leaveSession()}>Leave</button>
      </header>

      <div className="mt-4 space-y-3">
        {displayRole ? <p className="text-xs text-secondary">Backend role hint: {displayRole} · Zoom session role: {roleLabel}</p> : null}
        {state === 'loading' ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">{notice || 'Preparing the secure session…'}</p> : null}
        {waiting ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="font-bold">Please wait for admission</p><p className="mt-1 text-sm">Your camera and microphone remain off while you wait. The seller or assigned partner will admit you.</p></div> : null}
        {state === 'reconnecting' ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm">{notice || 'The Video SDK is reconnecting automatically. Keep this window open.'}</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
        {permissionMessage ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><strong>Device permission needed.</strong> {permissionMessage}</p> : null}
        {notice && inSession ? <p role="status" className="text-sm text-secondary">{notice}</p> : null}

        {inSession ? <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="relative min-h-64 overflow-hidden rounded-xl bg-slate-950 p-2 sm:p-3">
              <div ref={connectedContainerHost} className="video-player-container-host absolute inset-2 overflow-hidden rounded-lg bg-slate-900 sm:inset-3" />
              {!participants.some((participant) => participant.bVideoOn) && !cameraOn ? <p className="absolute inset-2 z-10 grid place-items-center rounded-lg bg-slate-900 px-5 text-center text-sm text-slate-300 sm:inset-3">Camera video will appear here when you or another participant turns on a camera.</p> : null}
            </div>
            <aside className="space-y-4 rounded-xl border p-4">
              <div><h3 className="font-bold">Participants · {participants.length}</h3><ul className="mt-2 space-y-2 text-sm">{participants.map((participant) => <li key={participant.userId} className="flex justify-between gap-2"><span>{participant.displayName || 'Participant'}</span><span className="text-xs text-secondary">{participant.bVideoOn ? 'Camera on' : 'Camera off'}</span></li>)}</ul>{!participants.length ? <p className="mt-2 text-sm text-secondary">Waiting for another participant to join.</p> : null}</div>
              {(actualRole === 'host' || actualRole === 'manager') ? <div className="border-t pt-3"><h3 className="font-bold">Waiting for admission · {onHoldUsers.length}</h3>{!holdEnabled ? <p role="alert" className="mt-2 text-xs text-error">Admission hold is off for this session.</p> : null}{onHoldUsers.length ? <ul className="mt-2 space-y-2">{onHoldUsers.map((participant) => <li key={participant.userId} className="flex items-center justify-between gap-2 text-sm"><span>{participant.displayName || 'Buyer'}</span><button type="button" disabled={admittingId !== null} onClick={() => void admit(participant.userId)} className="rounded bg-primary px-2 py-1 text-xs font-bold text-on-primary disabled:opacity-50">{admittingId === participant.userId ? 'Admitting…' : 'Admit'}</button></li>)}</ul> : <p className="mt-2 text-sm text-secondary">No participants are waiting.</p>}</div> : null}
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <button type="button" disabled={!inSession || waiting || mediaBusy} onClick={() => void toggleCamera()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">{cameraOn ? 'Turn camera off' : 'Turn camera on'}</button>
            <button type="button" disabled={!inSession || waiting || mediaBusy} onClick={() => void toggleMicrophone()} className="rounded-lg border px-4 py-2.5 text-sm font-bold disabled:opacity-50">{audioOn && !microphoneMuted ? 'Mute microphone' : 'Enable microphone'}</button>
            <span className="ml-auto text-xs text-secondary">Recording is off</span>
          </div>
        </> : null}

        {state === 'failed' ? <div className="flex flex-wrap gap-2"><button type="button" disabled={reconnectBusy} onClick={() => void reconnect()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">{reconnectBusy ? 'Reconnecting…' : 'Reconnect with fresh access'}</button></div> : null}
        {state === 'ended' ? <p role="status" className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">This session is closed. Return to the tour card or partner job to review its current status.</p> : null}
      </div>
    </section>
  </div>;
}
