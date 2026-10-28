import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { authService, type AuthSession, type PhoneVerificationEvent, type PhoneVerificationStatus } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { userService } from '../../services/userService';
import type { UpdateUserPayload, User } from '../../types';
import { getAuthenticatorAccountEmail } from '../../utils/authenticatorEnrollment';
import Button from '../ui/Button';
import StepUpDialog from '../auth/StepUpDialog';
import AuthenticatorEnrollmentQrCode from '../auth/AuthenticatorEnrollmentQrCode';

interface AccountSecuritySettingsProps {
  user: User;
}

const e164Phone = /^\+[1-9]\d{1,14}$/;

const errorText = (error: unknown) => {
  if (error instanceof ApiRequestError && error.code) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

const AccountSecuritySettings = ({ user }: AccountSecuritySettingsProps) => {
  const { activeProfile, logout, updateUser, refreshProfiles } = useAuth();
  const stepUp = useBoundStepUp<unknown>();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [phoneChallenge, setPhoneChallenge] = useState<PhoneVerificationStatus | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHistory, setPhoneHistory] = useState<PhoneVerificationEvent[] | null>(null);
  const [signatoryIdentityId, setSignatoryIdentityId] = useState(user._id);
  const [authorityEvidenceId, setAuthorityEvidenceId] = useState('');
  const [signatoryExpiresAt, setSignatoryExpiresAt] = useState('');
  const [signatoryError, setSignatoryError] = useState<string | null>(null);
  const [signatorySuccess, setSignatorySuccess] = useState<string | null>(null);
  const [twoStepEnabled, setTwoStepEnabled] = useState<boolean | null>(null);
  const [twoStepPassword, setTwoStepPassword] = useState('');
  const [twoStepCode, setTwoStepCode] = useState('');
  const [twoStepEnrollment, setTwoStepEnrollment] = useState<Awaited<ReturnType<typeof authService.enrollTwoStep>> | null>(null);
  const [twoStepBusy, setTwoStepBusy] = useState(false);
  const [twoStepError, setTwoStepError] = useState<string | null>(null);
  const twoStepAccountEmail = getAuthenticatorAccountEmail(twoStepEnrollment?.provisioningUri ?? '', user.email);
  const [pendingStepUp, setPendingStepUp] = useState<'identity' | 'signatory' | 'privacy' | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<'private' | 'public'>('private');
  const [profileFollowable, setProfileFollowable] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const startKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void authService.getTwoStep().then((result) => { if (active) setTwoStepEnabled(result.enabled); })
      .catch((raw) => { if (active) setTwoStepError(errorText(raw)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSessionsLoading(true);
    void authService.sessions().then((result) => {
      if (active) setSessions(result.sessions);
    }).catch((raw) => {
      if (active) setSessionsError(errorText(raw));
    }).finally(() => {
      if (active) setSessionsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setProfileVisibility(activeProfile?.visibility === 'public' ? 'public' : 'private');
    setProfileFollowable(Boolean(activeProfile?.followable));
  }, [activeProfile?.id, activeProfile?.visibility, activeProfile?.followable]);

  const beginTwoStepEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (twoStepBusy || twoStepEnabled || !twoStepPassword) return;
    setTwoStepBusy(true); setTwoStepError(null);
    try {
      const enrollment = await authService.enrollTwoStep({ password: twoStepPassword });
      if (!enrollment.secret || !enrollment.provisioningUri || !Number.isFinite(Date.parse(enrollment.expiresAt)) || Date.parse(enrollment.expiresAt) <= Date.now()) throw new Error('The authenticator enrollment response is incomplete or expired. Refresh status and try again.');
      setTwoStepEnrollment(enrollment);
      setTwoStepPassword('');
    } catch (raw) { setTwoStepError(errorText(raw)); }
    finally { setTwoStepBusy(false); }
  };

  const confirmTwoStepEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!twoStepEnrollment || twoStepBusy || !/^\d{6}$/.test(twoStepCode)) return;
    if (Date.parse(twoStepEnrollment.expiresAt) <= Date.now()) { setTwoStepEnrollment(null); setTwoStepCode(''); setTwoStepError('This enrollment expired. Start again to receive a fresh authenticator setup.'); return; }
    setTwoStepBusy(true); setTwoStepError(null);
    try {
      const result = await authService.confirmTwoStep(twoStepCode);
      setTwoStepEnabled(result.enabled); setTwoStepEnrollment(null); setTwoStepCode('');
      toast.success('Authenticator verification is enabled for this account.');
    } catch (raw) { setTwoStepError(errorText(raw)); }
    finally { setTwoStepBusy(false); }
  };

  const requestIdentityChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentityError(null);
    const nextName = name.trim();
    const nextPhone = phone.trim();
    if (!nextName || nextName.length > 120) {
      setIdentityError('Name must be between 1 and 120 characters.');
      return;
    }
    if (nextPhone !== (user.phone ?? '') && nextPhone && !e164Phone.test(nextPhone)) {
      setIdentityError('Enter a phone number in E.164 format, such as +2348012345678.');
      return;
    }
    if ((user.phone ?? '') && !nextPhone) {
      setIdentityError('A saved phone number cannot be cleared with this endpoint. Enter a replacement number or restore the current value.');
      return;
    }

    const body: UpdateUserPayload = {};
    if (nextName !== user.name) body.name = nextName;
    if (nextPhone !== (user.phone ?? '')) body.phone = nextPhone;
    if (!Object.keys(body).length) {
      setIdentityError('There are no account identity changes to save.');
      return;
    }

    setSavingIdentity(true);
    const started = await stepUp.begin({
      method: 'PATCH',
      path: `/api/users/${encodeURIComponent(user._id)}`,
      body,
      label: 'Update your account identity',
      execute: (challengeId, exactBody) => userService.updateUser(user._id, exactBody, challengeId),
    });
    setSavingIdentity(false);
    if (started) setPendingStepUp('identity');
    if (!started) setIdentityError(stepUp.getError() ?? 'The secure update could not start. Refresh the account state and try again.');
  };

  const requestSignatory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignatoryError(null);
    setSignatorySuccess(null);
    const identityId = signatoryIdentityId.trim();
    const evidenceId = authorityEvidenceId.trim();
    const expiration = Date.parse(signatoryExpiresAt);
    if (!identityId || !evidenceId || !Number.isFinite(expiration) || expiration <= Date.now()) {
      setSignatoryError('Enter an organization member identity, an authority evidence ID, and a future expiry date.');
      return;
    }
    const body = { identityId, authorityEvidenceId: evidenceId, expiresAt: new Date(expiration).toISOString() };
    const started = await stepUp.begin({
      method: 'POST',
      path: '/api/profiles/current/signatories',
      body,
      label: 'Request organization signatory authority',
      execute: (challengeId, exactBody) => profileService.submitSignatory(exactBody, challengeId),
    });
    if (started) setPendingStepUp('signatory');
    if (!started) setSignatoryError(stepUp.getError() ?? 'The secure request could not start. Refresh the organization state and try again.');
  };

  const requestProfilePrivacy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPrivacyError(null);
    setPrivacyMessage(null);
    if (!activeProfile || !Array.isArray(activeProfile.permissions) || !activeProfile.permissions.includes('team.manage')) {
      setPrivacyError('The active profile does not report the required team.manage permission.');
      return;
    }
    if (!Number.isInteger(activeProfile.version) || activeProfile.version < 0) {
      setPrivacyError('The current profile version is unavailable. Refresh the profile before changing privacy settings.');
      return;
    }
    const visibility = activeProfile.kind === 'buyer' ? 'private' : profileVisibility;
    const followable = visibility === 'public' && profileFollowable;
    const body = { visibility, followable, expectedVersion: activeProfile.version };
    const started = await stepUp.begin({
      method: 'PATCH', path: '/api/profiles/current/privacy', body,
      label: 'Update active profile visibility settings',
      execute: (challengeId, exactBody) => profileService.updatePrivacy(exactBody, challengeId),
    });
    if (started) setPendingStepUp('privacy');
    if (!started) setPrivacyError(stepUp.getError() ?? 'The secure profile privacy update could not start.');
  };

  const completeStepUp = async (code: string) => {
    const action = pendingStepUp;
    const result = await stepUp.complete(code);
    if (!result.ok) {
      const message = result.error ?? stepUp.error ?? 'The protected request was not accepted. Review the current server state and try again.';
      if (action === 'privacy') setPrivacyError(message);
      else if (action === 'signatory') setSignatoryError(message);
      else setIdentityError(message);
      return false;
    }
    setPendingStepUp(null);
    if (action === 'signatory') {
      setAuthorityEvidenceId('');
      setSignatorySuccess('The request was submitted. Signatory authority is not active unless and until independent staff review approves it.');
      return true;
    }
    if (action === 'privacy') {
      await refreshProfiles();
      setPrivacyMessage('Profile privacy settings were updated from the server.');
      return true;
    }
    if (typeof result.value === 'object' && result.value !== null && '_id' in result.value && 'name' in result.value && 'email' in result.value && 'role' in result.value) {
      updateUser(result.value as User);
    }
    toast.success('Account details updated. Sign in again to continue; the server revokes existing sessions after identity changes.');
    logout();
    return true;
  };

  const revokeOtherSessions = async () => {
    if (sessionBusy || !window.confirm('Sign out all other sessions? This device will remain signed in.')) return;
    setSessionBusy(true);
    setSessionMessage(null);
    try {
      await authService.revokeOtherSessions();
      setSessionMessage('Other sessions were revoked. This device remains signed in.');
      setSessions((current) => current.filter((session) => session.current));
    } catch (error) {
      setSessionMessage(errorText(error));
    } finally {
      setSessionBusy(false);
    }
  };

  const refreshSessions = async () => {
    if (sessionsLoading || sessionBusy) return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const result = await authService.sessions();
      setSessions(result.sessions);
    } catch (raw) {
      setSessionsError(errorText(raw));
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (session: AuthSession) => {
    if (session.current || sessionBusy || !window.confirm('Sign out this session? This cannot be undone.')) return;
    setSessionBusy(true);
    setSessionMessage(null);
    setSessionsError(null);
    try {
      const result = await authService.revokeSession(session.id);
      setSessionMessage(result.revoked > 0 ? 'The session was revoked.' : 'The server did not revoke a session. Refresh the list to check its current state.');
      const refreshed = await authService.sessions();
      setSessions(refreshed.sessions);
    } catch (raw) {
      setSessionsError(errorText(raw));
    } finally {
      setSessionBusy(false);
    }
  };

  const startPhoneChallenge = async () => {
    if (!user.phone || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      if (!startKeyRef.current) startKeyRef.current = crypto.randomUUID();
      const status = await authService.startPhoneVerification(startKeyRef.current);
      startKeyRef.current = null;
      setPhoneChallenge(status);
      setPhoneCode('');
    } catch (error) {
      // Keep the same idempotency key so an explicit retry cannot create a second delivery.
      setPhoneError(errorText(error));
    } finally {
      setPhoneBusy(false);
    }
  };

  const refreshPhoneChallenge = async () => {
    if (!phoneChallenge || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      setPhoneChallenge(await authService.phoneVerification(phoneChallenge.id));
    } catch (error) {
      setPhoneError(errorText(error));
    } finally {
      setPhoneBusy(false);
    }
  };

  const submitPhoneCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phoneChallenge || phoneBusy || !/^\d+$/.test(phoneCode)) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      setPhoneChallenge(await authService.verifyPhone(phoneChallenge.id, phoneCode));
      setPhoneCode('');
    } catch (error) {
      setPhoneError(errorText(error));
    } finally {
      setPhoneBusy(false);
    }
  };

  const cancelPhoneChallenge = async () => {
    if (!phoneChallenge || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await authService.cancelPhoneVerification(phoneChallenge.id);
      startKeyRef.current = null;
      setPhoneChallenge(null);
      setPhoneCode('');
    } catch (error) {
      setPhoneError(errorText(error));
    } finally {
      setPhoneBusy(false);
    }
  };

  const loadPhoneHistory = async () => {
    if (phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      const result = await authService.phoneVerificationHistory();
      setPhoneHistory(result.events);
    } catch (error) {
      setPhoneError(errorText(error));
    } finally {
      setPhoneBusy(false);
    }
  };

  const verified = Boolean(phoneChallenge?.verifiedAt);

  return (
    <section className="space-y-5 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 sm:p-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Account security</p>
        <h3 className="mt-1 text-xl font-bold">Identity and sign-in</h3>
        <p className="mt-1 text-sm text-secondary">Account-level changes are separate from the selected profile and require current-session verification.</p>
      </div>

      <form className="space-y-4" onSubmit={(event) => void requestIdentityChange(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-secondary" htmlFor="account-security-name">
            Full name
            <input id="account-security-name" className="w-full rounded-lg border border-outline-variant/20 px-4 py-3 text-sm font-normal text-on-surface" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-secondary" htmlFor="account-security-phone">
            Phone number
            <input id="account-security-phone" className="w-full rounded-lg border border-outline-variant/20 px-4 py-3 text-sm font-normal text-on-surface" value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="+2348012345678" />
          </label>
        </div>
        <p className="text-xs text-secondary">The documented account update accepts a 1–120 character name and an E.164 phone number. Changing either revokes current sessions and identity-bound verification approvals.</p>
        {identityError ? <p role="alert" className="text-sm text-error">{identityError}</p> : null}
        <Button type="submit" disabled={savingIdentity || Boolean(stepUp.challenge)} loading={savingIdentity} loadingLabel="Preparing secure update…">Save account details</Button>
      </form>

      <div className="grid gap-4 border-t border-outline-variant/10 pt-5 lg:grid-cols-2">
        <section className="rounded-lg bg-surface-container-low p-4" aria-labelledby="phone-verification-heading">
          <h4 id="phone-verification-heading" className="font-bold">Phone verification</h4>
          <p className="mt-1 text-sm text-secondary">SMS is sent to the phone number saved on this account. Phone verification does not replace identity or organization verification.</p>
          {!user.phone ? <p className="mt-3 text-sm text-amber-800">Add an E.164 phone number and sign in again before requesting a verification code.</p> : null}
          {phoneChallenge ? <div className="mt-3 rounded-md bg-white p-3 text-sm">
            <p><strong>Status:</strong> {phoneChallenge.state.replace(/_/g, ' ')}</p>
            <p><strong>Expires:</strong> {new Date(phoneChallenge.expiresAt).toLocaleString()}</p>
            {phoneChallenge.errorCode ? <p className="text-amber-800"><strong>Delivery result:</strong> {phoneChallenge.errorCode}</p> : null}
            {phoneChallenge.sentAt ? <p><strong>Sent:</strong> {new Date(phoneChallenge.sentAt).toLocaleString()}</p> : null}
            {verified ? <p role="status" className="mt-2 font-semibold text-emerald-700">Phone verified.</p> : null}
          </div> : null}
          {phoneError ? <p role="alert" className="mt-3 text-sm text-error">{phoneError}</p> : null}
          {phoneHistory ? <div className="mt-3 rounded-md bg-white p-3"><h5 className="text-xs font-bold">Recent verification history</h5>{phoneHistory.length ? <ul className="mt-2 space-y-2">{phoneHistory.map((event) => <li key={event.id} className="border-t pt-2 text-xs"><span className="font-semibold">{event.action.replace(/_/g, ' ')}</span> · attempt {event.attempt} · {new Date(event.at).toLocaleString()}{event.errorCode ? <span className="ml-1 text-amber-800">({event.errorCode})</span> : null}<span className="block text-[10px] text-secondary">Challenge {event.challengeId}</span></li>)}</ul> : <p className="mt-1 text-xs text-secondary">No verification events were returned.</p>}</div> : null}
          {!phoneChallenge ? <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={!user.phone || phoneBusy} loading={phoneBusy} loadingLabel="Requesting…" onClick={() => void startPhoneChallenge()}>Send verification code</Button>
            <Button type="button" variant="secondary" disabled={phoneBusy} onClick={() => void loadPhoneHistory()}>Load recent history</Button>
          </div> : <>
            {!verified ? <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => void submitPhoneCode(event)}>
              <label className="min-w-40 flex-1 space-y-1 text-xs font-bold" htmlFor="phone-verification-code">Verification code
                <input id="phone-verification-code" className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2 text-sm font-normal" inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ''))} />
              </label>
              <Button type="submit" disabled={phoneBusy || !/^\d+$/.test(phoneCode)} loading={phoneBusy} loadingLabel="Verifying…">Verify</Button>
            </form> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={phoneBusy} onClick={() => void refreshPhoneChallenge()}>Refresh status</Button>
              {!verified ? <Button type="button" variant="secondary" disabled={phoneBusy} onClick={() => void cancelPhoneChallenge()}>Cancel request</Button> : null}
              <Button type="button" variant="secondary" disabled={phoneBusy} onClick={() => void loadPhoneHistory()}>Load recent history</Button>
            </div>
          </>}
          <p className="mt-3 text-xs text-secondary">If SMS delivery is unavailable, the returned configuration/provider error is shown here. The request is not retried automatically.</p>
        </section>

        <section className="rounded-lg bg-surface-container-low p-4" aria-labelledby="sessions-heading">
          <h4 id="sessions-heading" className="font-bold">Signed-in sessions</h4>
          <p className="mt-1 text-sm text-secondary">Review active session dates and revoke individual sessions. Session details are limited to the fields returned by the account API.</p>
          {sessionsError ? <p role="alert" className="mt-2 text-sm text-error">{sessionsError}</p> : null}
          {sessionMessage ? <p role="status" className="mt-3 text-sm">{sessionMessage}</p> : null}
          {sessionsLoading && !sessions.length ? <p className="mt-3 text-sm text-secondary">Loading active sessions…</p> : null}
          <ul className="mt-3 space-y-2">{sessions.map((session) => <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white p-3 text-xs">
            <span><strong>{session.current ? 'This device' : 'Other session'}</strong><br />Started {new Date(session.createdAt).toLocaleString()} · expires {new Date(session.expiresAt).toLocaleString()}</span>
            {!session.current ? <Button type="button" variant="ghost" disabled={sessionBusy || sessionsLoading} onClick={() => void revokeSession(session)}>Revoke session</Button> : <span className="text-secondary">Current</span>}
          </li>)}</ul>
          {!sessionsLoading && !sessions.length && !sessionsError ? <p className="mt-3 text-sm text-secondary">No active sessions were returned.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={sessionBusy || sessionsLoading} onClick={() => void refreshSessions()}>Refresh sessions</Button><Button type="button" variant="secondary" disabled={sessionBusy} loading={sessionBusy} loadingLabel="Revoking…" onClick={() => void revokeOtherSessions()}>Sign out other sessions</Button></div>
        </section>
      </div>

      {activeProfile ? <section className="border-t border-outline-variant/10 pt-5">
        <div><h4 className="font-bold">Active profile visibility</h4><p className="mt-1 text-sm text-secondary">These are profile settings, separate from account identity. Buyer profiles must remain private. The server rechecks current profile authority and version.</p></div>
        {!Array.isArray(activeProfile.permissions) || !activeProfile.permissions.includes('team.manage') ? <p className="mt-3 text-sm text-amber-800">The active profile does not report `team.manage`; privacy controls are unavailable.</p> : <form onSubmit={(event) => void requestProfilePrivacy(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-secondary">Visibility<select value={activeProfile.kind === 'buyer' ? 'private' : profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as 'private' | 'public')} disabled={activeProfile.kind === 'buyer' || Boolean(stepUp.challenge)} className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal"><option value="private">Private</option><option value="public">Public</option></select></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={activeProfile.kind === 'buyer' ? false : profileFollowable} onChange={(event) => setProfileFollowable(event.target.checked)} disabled={activeProfile.kind === 'buyer' || profileVisibility !== 'public' || Boolean(stepUp.challenge)} />Allow profile follows</label>
          <div className="sm:col-span-2">{privacyError ? <p role="alert" className="mb-2 text-sm text-error">{privacyError}</p> : null}{privacyMessage ? <p role="status" className="mb-2 text-sm text-emerald-800">{privacyMessage}</p> : null}<Button type="submit" disabled={Boolean(stepUp.challenge) || stepUp.busy}>Save profile privacy with authenticator</Button></div>
        </form>}
      </section> : null}

      <div id="authenticator-enrollment" className="border-t border-outline-variant/10 pt-5">
        <h4 className="font-bold">Authenticator enrollment</h4>
        <p className="mt-1 text-sm text-secondary">Account status: {twoStepEnabled === null ? 'checking…' : twoStepEnabled ? 'Authenticator enabled' : 'Authenticator not enabled'}.</p>
        <p className="mt-2 text-sm text-secondary">Issuer: <strong className="text-on-surface">REALTIQ</strong> · Account label: <strong className="text-on-surface">{twoStepAccountEmail}</strong></p>
        <p className="mt-1 text-xs text-secondary">Authenticator apps save this label when you scan the QR code.</p>
        {twoStepError ? <p role="alert" className="mt-2 text-sm text-error">{twoStepError}</p> : null}
        {twoStepEnabled === false && !twoStepEnrollment ? <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => void beginTwoStepEnrollment(event)}>
          <label htmlFor="two-step-password" className="min-w-56 flex-1 space-y-1 text-xs font-bold">Current password<input id="two-step-password" type="password" autoComplete="current-password" value={twoStepPassword} onChange={(event) => setTwoStepPassword(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2 text-sm font-normal" /></label>
          <Button type="submit" disabled={twoStepBusy || !twoStepPassword} loading={twoStepBusy} loadingLabel="Preparing…">Set up authenticator</Button>
        </form> : null}
        {twoStepEnrollment ? <div className="mt-3 rounded-lg bg-surface-container-low p-4">
          <p className="text-sm">Scan this QR code with your authenticator app before {new Date(twoStepEnrollment.expiresAt).toLocaleString()}.</p>
          <div className="mt-3 flex justify-center">
            <AuthenticatorEnrollmentQrCode provisioningUri={twoStepEnrollment.provisioningUri} />
          </div>
          <details className="mt-3 rounded-lg border border-outline-variant/20 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold">Set up manually with a key</summary>
            <p className="mt-2 text-xs text-secondary">Issuer: REALTIQ · Account: {twoStepAccountEmail}</p>
            <code className="mt-2 block break-all rounded bg-surface-container-low p-3 text-sm select-all" aria-label="Authenticator setup key">{twoStepEnrollment.secret}</code>
          </details>
          <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => void confirmTwoStepEnrollment(event)}>
            <label htmlFor="two-step-confirm-code" className="min-w-48 flex-1 space-y-1 text-xs font-bold">Authenticator code<input id="two-step-confirm-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={twoStepCode} onChange={(event) => setTwoStepCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2 text-sm font-normal" /></label>
            <Button type="submit" disabled={twoStepBusy || twoStepCode.length !== 6} loading={twoStepBusy} loadingLabel="Verifying…">Confirm authenticator</Button>
            <Button type="button" variant="secondary" disabled={twoStepBusy} onClick={() => { setTwoStepEnrollment(null); setTwoStepCode(''); }}>Cancel</Button>
          </form>
        </div> : null}
      </div>

      {activeProfile && (activeProfile.structure === 'company' || activeProfile.structure === 'cooperative') ? <section className="border-t border-outline-variant/10 pt-5">
        <div>
          <h4 className="font-bold">Organization signatory request</h4>
          <p className="mt-1 text-sm text-secondary">The server checks current organization authority, roster membership, evidence and expiry. A submitted request does not grant signatory authority before independent staff approval.</p>
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void requestSignatory(event)}>
          <label className="space-y-1.5 text-xs font-bold text-secondary" htmlFor="signatory-identity-id">Organization member identity ID
            <input id="signatory-identity-id" className="w-full rounded-lg border border-outline-variant/20 px-4 py-3 text-sm font-normal text-on-surface" value={signatoryIdentityId} onChange={(event) => setSignatoryIdentityId(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-secondary" htmlFor="signatory-evidence-id">Authority evidence ID
            <input id="signatory-evidence-id" className="w-full rounded-lg border border-outline-variant/20 px-4 py-3 text-sm font-normal text-on-surface" value={authorityEvidenceId} onChange={(event) => setAuthorityEvidenceId(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-secondary sm:col-span-2" htmlFor="signatory-expires-at">Authority expiry
            <input id="signatory-expires-at" type="datetime-local" className="w-full rounded-lg border border-outline-variant/20 px-4 py-3 text-sm font-normal text-on-surface sm:max-w-md" value={signatoryExpiresAt} onChange={(event) => setSignatoryExpiresAt(event.target.value)} />
          </label>
          <div className="sm:col-span-2">
            {signatoryError ? <p role="alert" className="mb-3 text-sm text-error">{signatoryError}</p> : null}
            {signatorySuccess ? <p role="status" className="mb-3 text-sm text-emerald-800">{signatorySuccess}</p> : null}
            <Button type="submit" disabled={Boolean(stepUp.challenge) || stepUp.busy}>Submit signatory request</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-secondary">Use member identity and authority evidence IDs from current organization records. Evidence content is not uploaded by this form.</p>
      </section> : null}

      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { stepUp.cancel(); setPendingStepUp(null); }} onSubmit={completeStepUp} />
    </section>
  );
};

export default AccountSecuritySettings;
