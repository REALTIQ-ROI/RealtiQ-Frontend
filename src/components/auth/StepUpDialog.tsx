import { useEffect, useState, type FormEvent } from 'react';
import type { BoundStepUpChallenge } from '../../hooks/useBoundStepUp';
import Button from '../ui/Button';

interface StepUpDialogProps {
  challenge: BoundStepUpChallenge | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (code: string) => Promise<boolean>;
}

const StepUpChallengeForm = ({ challenge, busy, error, onCancel, onSubmit }: StepUpDialogProps & { challenge: BoundStepUpChallenge }) => {
  const [code, setCode] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(initialTick); window.clearInterval(timer); };
  }, [challenge.challengeId]);

  const secondsLeft = now === 0 ? null : Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const submittedCode = code;
    setCode('');
    await onSubmit(submittedCode);
  };

  return <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="step-up-title" aria-describedby="step-up-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Account security</p>
      <h2 id="step-up-title" className="mt-2 text-2xl font-black">Confirm with authenticator</h2>
      <p id="step-up-description" className="mt-2 text-sm text-secondary">{challenge.label}. This one-use challenge is bound to the current profile and exact request. {secondsLeft === null ? 'Checking challenge expiry…' : `It expires in ${secondsLeft} seconds.`}</p>
      <form className="mt-5 space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-bold" htmlFor="step-up-code">Six-digit authenticator code</label>
        <input id="step-up-code" aria-label="Six-digit authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-outline-variant/30 px-4 py-3 text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary/20" placeholder="000000" />
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        {secondsLeft === 0 ? <p role="alert" className="text-sm text-error">Challenge expired. Close this dialog and start again.</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={busy} loadingLabel="Verifying…" disabled={busy || code.length !== 6 || secondsLeft === null || secondsLeft === 0}>Verify and continue</Button>
        </div>
      </form>
    </section>
  </div>;
};

const StepUpDialog = (props: StepUpDialogProps) => props.challenge
  ? <StepUpChallengeForm key={props.challenge.challengeId} {...props} challenge={props.challenge} />
  : null;

export default StepUpDialog;
