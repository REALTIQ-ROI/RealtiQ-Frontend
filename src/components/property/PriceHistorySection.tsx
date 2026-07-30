import { useEffect, useMemo, useState } from 'react';
import SimpleLineChart from '../analytics/SimpleLineChart';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import { propertyService, type PropertyPriceHistoryChartResponse, type PropertyPriceHistoryResponse } from '../../services/propertyService';

const formatCurrency = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [historyResponse, chartResponse] = await Promise.all([
        propertyService.getPriceHistory(propertyId, { page: 1, limit: 20, sort: 'desc' }),
        propertyService.getPriceHistoryChart(propertyId),
      ]);
      setHistory(historyResponse);
      setChart(chartResponse);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load price history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const currency = history?.property.currency || chart?.currency || 'NGN';
  const chartData = useMemo(
    () => (chart?.series ?? []).map((point) => ({ label: formatDate(point.date), value: point.price })),
    [chart],
  );

  if (loading) return <LoadingState label="Loading price history..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <section className="space-y-5" aria-label="Price history">
      <div>
        <h2 className="text-2xl font-bold">Price History</h2>
        <p className="mt-1 text-sm text-secondary">Public listing-price changes recorded by RealtiQ.</p>
      </div>

      {history ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Initial price', formatCurrency(history.summary.initialPrice, currency)],
            ['Current price', formatCurrency(history.summary.currentPrice, currency)],
            ['Total change', formatCurrency(history.summary.absoluteChange, currency)],
            ['Percentage', `${history.summary.percentageChange.toFixed(2)}%`],
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
        <SimpleLineChart
          data={chartData}
          formatValue={(value) => formatCurrency(value, currency)}
          emptyLabel="No price-history chart data is available for this property."
        />
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
                  <td className="px-4 py-3">{item.percentageChange.toFixed(2)}%</td>
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
    </section>
  );
};

export default PriceHistorySection;
