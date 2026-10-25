import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { authService, type PhoneVerificationStatus } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { userService } from '../../services/userService';
import type { UpdateUserPayload, User } from '../../types';
import Button from '../ui/Button';
import StepUpDialog from '../auth/StepUpDialog';

interface AccountSecuritySettingsProps {
  user: User;
}

const e164Phone = /^\+[1-9]\d{1,14}$/;

const errorText = (error: unknown) => {
  if (error instanceof ApiRequestError && error.code) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

const AccountSecuritySettings = ({ user }: AccountSecuritySettingsProps) => {
  const { activeProfile, logout, updateUser } = useAuth();
  const stepUp = useBoundStepUp<unknown>();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [phoneChallenge, setPhoneChallenge] = useState<PhoneVerificationStatus | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHistoryCount, setPhoneHistoryCount] = useState<number | null>(null);
  const [signatoryIdentityId, setSignatoryIdentityId] = useState(user._id);
  const [authorityEvidenceId, setAuthorityEvidenceId] = useState('');
  const [signatoryExpiresAt, setSignatoryExpiresAt] = useState('');
  const [signatoryError, setSignatoryError] = useState<string | null>(null);
  const [signatorySuccess, setSignatorySuccess] = useState<string | null>(null);
  const [pendingStepUp, setPendingStepUp] = useState<'identity' | 'signatory' | null>(null);
  const startKeyRef = useRef<string | null>(null);

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

  const completeStepUp = async (code: string) => {
    const action = pendingStepUp;
    const result = await stepUp.complete(code);
    if (!result.ok) {
      const message = result.error ?? stepUp.error ?? 'The protected request was not accepted. Review the current server state and try again.';
      if (action === 'signatory') setSignatoryError(message);
      else setIdentityError(message);
      return false;
    }
    setPendingStepUp(null);
    if (action === 'signatory') {
      setAuthorityEvidenceId('');
      setSignatorySuccess('The request was submitted. Signatory authority is not active unless and until independent staff review approves it.');
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
    } catch (error) {
      setSessionMessage(errorText(error));
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
      setPhoneHistoryCount(result.events.length);
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
          {phoneHistoryCount !== null ? <p className="mt-2 text-xs text-secondary">{phoneHistoryCount} recent verification event(s). The handoff does not specify event-row fields, so details are not inferred.</p> : null}
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
          <p className="mt-1 text-sm text-secondary">Revoke all other sessions while keeping this device active.</p>
          <p className="mt-2 text-xs text-secondary">The handoff identifies a safe session-list endpoint but does not define session row fields; this screen does not invent device/session details.</p>
          {sessionMessage ? <p role="status" className="mt-3 text-sm">{sessionMessage}</p> : null}
          <Button className="mt-3" type="button" variant="secondary" disabled={sessionBusy} loading={sessionBusy} loadingLabel="Revoking…" onClick={() => void revokeOtherSessions()}>Sign out other sessions</Button>
        </section>
      </div>

      <div className="border-t border-outline-variant/10 pt-5">
        <h4 className="font-bold">Authenticator enrollment</h4>
        <p className="mt-1 text-sm text-amber-900">Step-up works with an already-enabled TOTP factor. Enrollment and confirmation request/response DTOs are controller-defined but not included in the handoff, so setup remains unavailable here.</p>
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
