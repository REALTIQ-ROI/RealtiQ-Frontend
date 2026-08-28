import { useEffect, useState } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { ApiRequestError } from '../../lib/axios';
import { trustService } from '../../services/trustService';
import type { TrustAppeal, TrustDecision } from '../../types/phase45';
import { useAuth } from '../../contexts/AuthContext';
import BuyerTrustExperience from '../../components/trust/BuyerTrustExperience';
import TrustProgressChecklist from '../../components/trust/TrustProgressChecklist';

const componentNames: Record<string, string> = {
  identity: 'Identity verification',
  transactions: 'Completed transactions',
  ratings: 'Ratings',
  responsiveness: 'Responsiveness',
  disputes: 'Disputes',
  titleQuality: 'Title quality',
};
const TrustAccount = () => {
  const { user } = useAuth();
  const [trust, setTrust] = useState<TrustDecision | null>(null);
  const [appeals, setAppeals] = useState<TrustAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const [decision, history] = await Promise.all([
        trustService.mine(force),
        trustService.appeals(force),
      ]);
      setTrust(decision);
      setAppeals(history);
    } catch (raw) {
      setError(
        raw instanceof Error
          ? raw.message
          : 'Unable to load trust information.',
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const openAppeal = appeals.some((appeal) => appeal.status === 'open');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trust || submitting || openAppeal) return;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 2000) {
      setNotice('Provide a reason between 1 and 2,000 characters.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      await trustService.createAppeal(trust.publicReference, trimmed);
      setReason('');
      setNotice('Your appeal was submitted for review.');
      await load(true);
    } catch (raw) {
      setNotice(
        raw instanceof ApiRequestError && raw.status === 409
          ? raw.message
          : raw instanceof Error
            ? raw.message
            : 'Unable to submit appeal.',
      );
    } finally {
      setSubmitting(false);
    }
  };
  if (user?.role === 'buyer')
    return (
      <BuyerTrustExperience
        trust={trust}
        appeals={appeals}
        loading={loading}
        error={error}
        reason={reason}
        submitting={submitting}
        notice={notice}
        onReasonChange={setReason}
        onSubmit={submit}
        onRetry={() => void load(true)}
      />
    );
  return (
    <PublicLayout>
      <main className={'mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-8'}>
        <header>
          <p
            className={
              'text-xs font-bold uppercase tracking-widest text-secondary'
            }
          >
            Account trust
          </p>
          <h1 className={'mt-2 text-4xl font-black'}>
            Trust and badge explanation
          </h1>
          <p className={'mt-2 text-sm text-secondary'}>
            This page explains safe, account-level trust evidence. It does not
            expose KYC documents, disputes, risk signals, or administrative
            notes.
          </p>
        </header>
        {loading ? (
          <LoadingState label={'Calculating trust explanation...'} />
        ) : null}
        {error ? (
          <ErrorState message={error} onRetry={() => void load(true)} />
        ) : null}
        {trust ? <TrustProgressChecklist trust={trust} role={'landlord'} /> : null}
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
                    {trust.score}/100 ·{' '}
                    <span className={'capitalize'}>{trust.band}</span>
                  </h2>
                </div>
                <span
                  className={
                    'rounded-full bg-primary px-5 py-2 font-black capitalize text-on-primary'
                  }
                  aria-label={`Badge: ${trust.badge}`}
                >
                  {trust.badge} badge
                </span>
              </div>
              {trust.insufficientHistory ? (
                <div className={'mt-4 rounded-xl bg-surface-container-low p-4'}>
                  <strong>Limited platform history</strong>
                  <p className={'mt-1 text-sm text-secondary'}>
                    There is not yet enough verified platform activity for a
                    mature history assessment. This is neutral, not evidence of
                    poor quality.
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
                      <dt className={'font-bold'}>
                        {componentNames[key] ?? key}
                      </dt>
                      <dd className={'mt-1 text-sm'}>
                        {component.available === false ? (
                          <span>
                            Unavailable — not included as negative evidence
                          </span>
                        ) : (
                          <span>
                            {component.score ?? 'Unknown'}/100
                            {component.count !== undefined
                              ? ` · ${component.count} records`
                              : ''}
                          </span>
                        )}
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
              <h2 className={'text-xl font-black'}>Appeal this decision</h2>
              {openAppeal ? (
                <p
                  className={
                    'mt-2 rounded-lg bg-surface-container-low p-3 text-sm'
                  }
                >
                  An appeal is already open for this decision. A duplicate
                  request cannot be submitted.
                </p>
              ) : (
                <form className={'mt-3 space-y-3'} onSubmit={submit}>
                  <label
                    className={'block text-sm font-bold'}
                    htmlFor={'appeal-reason'}
                  >
                    Reason
                  </label>
                  <textarea
                    id={'appeal-reason'}
                    required
                    maxLength={2000}
                    rows={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={
                      'w-full rounded-lg bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary/20'
                    }
                  />
                  <div
                    className={
                      'flex items-center justify-between text-xs text-secondary'
                    }
                  >
                    <span>
                      Do not include KYC documents or sensitive evidence.
                    </span>
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
          <h2 className={'text-xl font-black'}>Appeal history</h2>
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
                    {new Date(appeal.createdAt).toLocaleString('en-NG')} ·
                    decision policy {appeal.decisionVersion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={'mt-2 text-sm text-secondary'}>
              No appeals submitted.
            </p>
          )}
        </section>
      </main>
    </PublicLayout>
  );
};
export default TrustAccount;
