import { Link } from 'react-router-dom';
import type { LandlordKycProgress, LandlordKycStepState } from '../../utils/landlordKycProgress';

const stepLabel: Record<LandlordKycStepState, string> = {
  complete: 'Complete',
  current: 'In progress',
  waiting: 'Waiting for review',
  needs_action: 'Action needed',
  upcoming: 'Upcoming',
};

const stepClass: Record<LandlordKycStepState, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  current: 'border-primary/30 bg-primary/5 text-primary',
  waiting: 'border-amber-200 bg-amber-50 text-amber-950',
  needs_action: 'border-red-200 bg-red-50 text-red-900',
  upcoming: 'border-outline-variant/15 bg-surface-container-low text-secondary',
};

interface LandlordKycProgressTrackerProps {
  progress: LandlordKycProgress;
}

const LandlordKycProgressTracker = ({ progress }: LandlordKycProgressTrackerProps) => (
  <section aria-labelledby="owner-kyc-progress-title" className="rounded-2xl border border-outline-variant/10 bg-white p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Your KYC journey</p><h2 id="owner-kyc-progress-title" className="mt-1 text-xl font-extrabold">KYC progress</h2></div>
      <span className={`rounded-full px-3 py-1 text-sm font-bold ${progress.approved ? 'bg-emerald-100 text-emerald-900' : 'bg-surface-container-low text-secondary'}`}>
        {progress.approved ? 'KYC approved' : `${progress.completedSteps} of 4 steps confirmed`}
      </span>
    </div>
    <p role="status" className="mt-3 text-sm text-secondary">{progress.summary}</p>
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label="KYC completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.completedSteps} of 4 KYC steps confirmed${progress.approved ? ', approved' : ''}`}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${progress.approved ? 'bg-emerald-600' : 'bg-primary'}`} style={{ width: `${progress.percent}%` }} />
    </div>
    <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {progress.steps.map((step) => <li key={step.id} className={`min-w-0 rounded-xl border p-4 ${stepClass[step.state]}`}>
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide">{stepLabel[step.state]}</span>{step.state === 'complete' ? <span className="material-symbols-outlined text-lg" aria-hidden="true">check_circle</span> : null}</div>
        <h3 className="mt-2 font-bold">{step.label}</h3><p className="mt-1 text-xs leading-5">{step.detail}</p>
        {step.id === 'profile' ? <Link className="mt-3 inline-block text-xs font-bold underline" to="/dashboard/landlord/settings">Open profile settings</Link> : null}
        {step.id === 'evidence' ? step.state === 'upcoming' ? <span className="mt-3 inline-block text-xs text-secondary">Available after profile review</span> : <a className="mt-3 inline-block text-xs font-bold underline" href="#kyc-evidence-upload">Go to evidence upload</a> : null}
        {step.id === 'submission' ? step.state === 'upcoming' ? <span className="mt-3 inline-block text-xs text-secondary">Available after evidence</span> : <a className="mt-3 inline-block text-xs font-bold underline" href="#kyc-case-submission">Go to case submission</a> : null}
        {step.id === 'review' ? step.state === 'upcoming' ? <span className="mt-3 inline-block text-xs text-secondary">Available after submission</span> : <a className="mt-3 inline-block text-xs font-bold underline" href="#kyc-case-list">Go to case status</a> : null}
      </li>)}
    </ol>
    <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm"><strong>Next:</strong> {progress.nextAction}</p>
  </section>
);

export default LandlordKycProgressTracker;
