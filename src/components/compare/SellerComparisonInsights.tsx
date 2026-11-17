import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../lib/axios';
import { compareService, type ComparisonInsights } from '../../services/compareService';

interface SellerComparisonInsightsProps {
  propertyId: string;
  profileId?: string;
}

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day}-${month}-${date.getFullYear()}`;
};

const SellerComparisonInsights = ({ propertyId, profileId = '' }: SellerComparisonInsightsProps) => {
  const [data, setData] = useState<ComparisonInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setData(null);
    setError(null);
    void compareService.getSellerInsights(propertyId)
      .then((result) => { if (current) setData(result); })
      .catch((reason: unknown) => { if (current) setError(reason); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [propertyId, profileId, attempt]);

  const requestId = error instanceof ApiRequestError ? error.requestId : undefined;
  const restricted = error instanceof ApiRequestError && (error.status === 403 || error.status === 404);

  return (
    <section className="mb-10 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6" aria-labelledby="comparison-insights-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="comparison-insights-heading" className="text-xl font-black">How buyers compare this listing</h2>
          <p className="mt-1 text-sm text-secondary">Anonymous totals only. No buyer identities or other compared listings are shown.</p>
        </div>
        {!loading && error ? <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg border px-3 py-2 text-sm font-bold">Refresh</button> : null}
      </div>

      {loading ? <p role="status" className="mt-5 text-sm text-secondary">Loading comparison insights…</p> : null}
      {error ? <div role="status" className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm text-secondary">
        <p>{restricted ? 'Comparison insights are not available for this listing in the current profile.' : 'Comparison insights could not be loaded right now.'}</p>
        {requestId ? <p className="mt-2 text-xs">Support reference: {requestId}</p> : null}
      </div> : null}
      {data ? <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Added to comparisons', data.comparisonInsights.events.addedToComparisons],
            ['Comparison opens', data.comparisonInsights.events.comparisonOpens],
            ['Removed from comparisons', data.comparisonInsights.events.removedFromComparisons],
            ['Enquiries with comparison context shared', data.comparisonInsights.events.comparisonContextEnquiries],
          ].map(([label, count]) => <div key={String(label)} className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-black">{count}</p>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-secondary">
          <span>Coverage: since comparison tracking was enabled</span>
          {data.comparisonInsights.firstTrackedEventAt ? <span>First activity: {formatDateLabel(data.comparisonInsights.firstTrackedEventAt)}</span> : null}
          {data.comparisonInsights.lastTrackedEventAt ? <span>Latest activity: {formatDateLabel(data.comparisonInsights.lastTrackedEventAt)}</span> : null}
        </div>
      </> : null}
    </section>
  );
};

export default SellerComparisonInsights;
