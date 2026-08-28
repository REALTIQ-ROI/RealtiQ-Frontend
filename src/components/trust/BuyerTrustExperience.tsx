import type { FormEvent } from 'react';
import PublicLayout from '../layout/PublicLayout';
import ErrorState from '../ui/ErrorState';
import LoadingState from '../ui/LoadingState';
import type { TrustAppeal, TrustDecision } from '../../types/phase45';
import TrustProgressChecklist from './TrustProgressChecklist';

interface Props {
  trust: TrustDecision | null;
  appeals: TrustAppeal[];
  loading: boolean;
  error: string;
  reason: string;
  submitting: boolean;
  notice: string;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onRetry: () => void;
}
const names: Record<string, string> = {
  identity: 'Identity verification',
  transactions: 'Completed transactions',
  ratings: 'Ratings',
  responsiveness: 'Responsiveness',
  disputes: 'Disputes',
  titleQuality: 'Title quality',
};
const BuyerTrustExperience = ({
  trust,
  appeals,
  loading,
  error,
  reason,
  submitting,
  notice,
  onReasonChange,
  onSubmit,
  onRetry,
}: Props) => {
  const openAppeal = appeals.some((appeal) => appeal.status === 'open');
  return (
    <PublicLayout>
      <main className={'mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-8'}>
        <header>
          <p
            className={
              'text-xs font-bold uppercase tracking-widest text-secondary'
            }
          >
            Buyer account
          </p>
          <h1 className={'mt-2 text-4xl font-black'}>Your account trust</h1>
          <p className={'mt-2 text-sm text-secondary'}>
            Understand the safe account evidence used to calculate your trust
            score. Seller badge tiers do not apply to buyer accounts.
          </p>
        </header>
        {loading ? (
          <LoadingState label={'Calculating account trust...'} />
        ) : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {trust ? <TrustProgressChecklist trust={trust} role={'buyer'} /> : null}
        {trust ? (
          <>
            <section
              className={
                'rounded-2xl border border-outline-variant/10 bg-white p-6'
              }
            >
              <div
                className={'flex flex-wrap items-center justify-between gap-4'}
              >
                <div>
                  <p className={'text-xs text-secondary'}>
                    {trust.publicReference}
                  </p>
                  <h2 className={'mt-1 text-3xl font-black'}>
                    {trust.score}/100{' '}
                    <span className={'capitalize text-secondary'}>
                      · {trust.band}
                    </span>
                  </h2>
                </div>
                <span
                  className={
                    'rounded-full bg-surface-container-low px-5 py-2 text-sm font-bold text-secondary'
                  }
                >
                  Seller badge not applicable
                </span>
              </div>
              <p className={'mt-3 text-sm text-secondary'}>
                Seller badges are not assigned to buyer accounts. This does not
                indicate low trust.
              </p>
              {trust.insufficientHistory ? (
                <div className={'mt-4 rounded-xl bg-surface-container-low p-4'}>
                  <strong>Limited platform history</strong>
                  <p className={'mt-1 text-sm text-secondary'}>
                    There is not yet enough verified activity for a mature
                    assessment. This is neutral.
                  </p>
                </div>
              ) : null}
              <dl className={'mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                {Object.entries(trust.components ?? {}).map(
                  ([key, component]) => (
                    <div
                      key={key}
                      className={'rounded-lg bg-surface-container-low p-4'}
                    >
                      <dt className={'font-bold'}>{names[key] ?? key}</dt>
                      <dd className={'mt-1 text-sm'}>
                        {component.available === false
                          ? 'Unavailable — not negative evidence'
                          : `${component.score ?? 'Unknown'}/100${component.count !== undefined ? ` · ${component.count} records` : ''}`}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
              <p className={'mt-4 text-xs text-secondary'}>
                Evidence freshness:{' '}
                {trust.evidenceFreshness
                  ? new Date(trust.evidenceFreshness).toLocaleString('en-NG')
                  : 'Unavailable'}{' '}
                · Policy: {trust.policyVersion}
              </p>
            </section>
            <section
              className={
                'rounded-2xl border border-outline-variant/10 bg-white p-6'
              }
            >
              <h2 className={'text-xl font-black'}>Request a review</h2>
              {openAppeal ? (
                <p
                  className={
                    'mt-2 rounded-lg bg-surface-container-low p-3 text-sm'
                  }
                >
                  An appeal is already open for this decision.
                </p>
              ) : (
                <form className={'mt-3 space-y-3'} onSubmit={onSubmit}>
                  <label
                    htmlFor={'buyer-appeal-reason'}
                    className={'block text-sm font-bold'}
                  >
                    Reason
                  </label>
                  <textarea
                    id={'buyer-appeal-reason'}
                    required
                    rows={5}
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => onReasonChange(event.target.value)}
                    className={'w-full rounded-lg bg-surface-container-low p-3'}
                  />
                  <div
                    className={'flex justify-between text-xs text-secondary'}
                  >
                    <span>Do not include sensitive documents.</span>
                    <span>{reason.length}/2000</span>
                  </div>
                  <button
                    disabled={submitting}
                    className={
                      'rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60'
                    }
                  >
                    {submitting ? 'Submitting…' : 'Submit appeal'}
                  </button>
                </form>
              )}
              {notice ? (
                <p
                  aria-live={'polite'}
                  className={'mt-3 text-sm font-semibold'}
                >
                  {notice}
                </p>
              ) : null}
            </section>
          </>
        ) : null}
        <section
          className={
            'rounded-2xl border border-outline-variant/10 bg-white p-6'
          }
        >
          <h2 className={'text-xl font-black'}>Review history</h2>
          {appeals.length ? (
            <ul className={'mt-3 space-y-3'}>
              {appeals.map((appeal) => (
                <li
                  key={appeal.publicReference}
                  className={'rounded-lg bg-surface-container-low p-4'}
                >
                  <div className={'flex justify-between gap-3'}>
                    <strong>{appeal.publicReference}</strong>
                    <span className={'capitalize'}>{appeal.status}</span>
                  </div>
                  <p className={'mt-2 text-sm'}>{appeal.reason}</p>
                  <p className={'mt-2 text-xs text-secondary'}>
                    {new Date(appeal.createdAt).toLocaleString('en-NG')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={'mt-2 text-sm text-secondary'}>
              No review requests submitted.
            </p>
          )}
        </section>
      </main>
    </PublicLayout>
  );
};
export default BuyerTrustExperience;
