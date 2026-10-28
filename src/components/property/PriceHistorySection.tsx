import { useEffect, useMemo, useState } from 'react';
import SimpleLineChart from '../analytics/SimpleLineChart';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import { propertyService, type PropertyPriceHistoryChartResponse, type PropertyPriceHistoryResponse } from '../../services/propertyService';

const formatCurrency = (value: number | null | undefined, currency = 'NGN') =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    : '—';

const formatPercentage = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

const directionClass = (direction: string) =>
  direction === 'increase'
    ? 'bg-emerald-50 text-emerald-700'
    : direction === 'decrease'
      ? 'bg-red-50 text-red-700'
      : 'bg-slate-100 text-slate-700';

const PriceHistorySection = ({ propertyId }: { propertyId: string }) => {
  const [history, setHistory] = useState<PropertyPriceHistoryResponse | null>(null);
  const [chart, setChart] = useState<PropertyPriceHistoryChartResponse | null>(null);
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setHistory(null);
    propertyService.getPriceHistory(propertyId, { page, limit: 20, sort: 'desc' })
      .then((response) => { if (active) setHistory(response); })
      .catch((raw: unknown) => { if (active) setError(raw instanceof Error ? raw.message : 'Unable to load price history.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, page, retryCount]);

  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    setChart(null);
    setChartError(null);
    setChartLoading(true);
    propertyService.getPriceHistoryChart(propertyId)
      .then((response) => { if (active) setChart(response); })
      .catch((raw: unknown) => { if (active) setChartError(raw instanceof Error ? raw.message : 'Unable to load price chart.'); })
      .finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [propertyId]);

  const currency = history?.property.currency || chart?.currency || 'NGN';
  const chartData = useMemo(
    () => (chart?.series ?? []).map((point) => ({ label: formatDate(point.date), value: point.price })),
    [chart],
  );

  if (loading) return <LoadingState label="Loading price history..." />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryCount((current) => current + 1)} />;

  return (
    <section className="space-y-5" aria-label="Price history">
      <div>
        <h2 className="text-2xl font-bold">Price History</h2>
        <p className="mt-1 text-sm text-secondary">Public listing-price changes recorded by RealtIQ.</p>
      </div>

      {history ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Initial price', formatCurrency(history.summary.initialPrice, currency)],
            ['Current price', formatCurrency(history.summary.currentPrice, currency)],
            ['Total change', formatCurrency(history.summary.absoluteChange, currency)],
            ['Percentage', formatPercentage(history.summary.percentageChange)],
            ['High / low', `${formatCurrency(history.summary.highestPrice, currency)} / ${formatCurrency(history.summary.lowestPrice, currency)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-outline-variant/10 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</p>
              <p className="mt-2 text-sm font-black text-primary">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-outline-variant/10 bg-white p-5">
        {chartLoading ? <LoadingState label="Loading price chart..." /> : chartError ? <p role="status" className="text-sm text-amber-800">Price chart unavailable: {chartError}</p> : <SimpleLineChart
          data={chartData}
          formatValue={(value) => formatCurrency(value, currency)}
          emptyLabel="No price-history chart data is available for this property."
        />}
      </div>

      {history?.history.length ? (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/10 bg-white">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-surface-container-low text-[10px] uppercase tracking-widest text-secondary">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Previous</th>
                <th className="px-4 py-3">New price</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Percent</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Currency</th>
              </tr>
            </thead>
            <tbody>
              {history.history.map((item) => (
                <tr key={item._id} className="border-t border-outline-variant/10">
                  <td className="px-4 py-3">{formatDate(item.effectiveAt || item.createdAt)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.previousPrice, item.currency)}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(item.newPrice, item.currency)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.absoluteChange, item.currency)}</td>
                  <td className="px-4 py-3">{formatPercentage(item.percentageChange)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold capitalize ${directionClass(item.changeType)}`}>
                      {item.changeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary">{item.reason || 'Not provided'}</td>
                  <td className="px-4 py-3">{item.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 text-center text-sm text-secondary">
          No price changes have been recorded for this property yet.
        </div>
      )}
      {history && history.total > history.limit ? <nav aria-label="Price history pages" className="flex items-center justify-between gap-4 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg bg-surface-container-low px-4 py-2 font-bold disabled:opacity-40">Previous</button>
        <span>Page {history.page} of {Math.ceil(history.total / history.limit)}</span>
        <button type="button" disabled={page * history.limit >= history.total} onClick={() => setPage((current) => current + 1)} className="rounded-lg bg-surface-container-low px-4 py-2 font-bold disabled:opacity-40">Next</button>
      </nav> : null}
    </section>
  );
};

export default PriceHistorySection;
