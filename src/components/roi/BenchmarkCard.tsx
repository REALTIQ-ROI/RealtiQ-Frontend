import Card from '../ui/Card';
import type { MarketBenchmark } from '../../services/roiService';
import { formatNaira, formatPercent } from './roiFormatters';

interface BenchmarkCardProps {
  benchmark: MarketBenchmark | null;
  propertyPrice?: number;
  loading?: boolean;
}

const BenchmarkCard = ({ benchmark, propertyPrice, loading = false }: BenchmarkCardProps) => {
  if (loading) {
    return <Card className="p-5 h-44 bg-surface-container-low animate-pulse"><span className="sr-only">Loading benchmark</span></Card>;
  }

  if (!benchmark) {
    return (
      <Card className="p-5">
        <p className="text-xs uppercase tracking-widest text-secondary font-bold">Market Benchmark</p>
        <p className="text-sm text-secondary mt-2">Load benchmark data to compare prices in the market.</p>
      </Card>
    );
  }

  const delta = propertyPrice && benchmark.avg ? ((propertyPrice - benchmark.avg) / benchmark.avg) * 100 : null;
  const markerPosition = benchmark.max > benchmark.min && propertyPrice
    ? Math.min(100, Math.max(0, ((propertyPrice - benchmark.min) / (benchmark.max - benchmark.min)) * 100))
    : 50;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-bold">Market Benchmark</p>
          <h2 className="text-xl font-extrabold">{formatNaira(benchmark.avg)} average</h2>
        </div>
        <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-secondary">
          {benchmark.count} listings
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider">Min</p>
          <p className="font-bold">{formatNaira(benchmark.min)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider">Avg</p>
          <p className="font-bold">{formatNaira(benchmark.avg)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider">Max</p>
          <p className="font-bold">{formatNaira(benchmark.max)}</p>
        </div>
      </div>

      {propertyPrice ? (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-surface-container-low relative">
            <span
              className="absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${markerPosition}%` }}
            />
          </div>
          <p className="text-sm text-secondary">
            This property is{' '}
            <strong className="text-on-surface">
              {delta === null ? 'not comparable' : `${formatPercent(Math.abs(delta), 1)} ${delta >= 0 ? 'above' : 'below'}`}
            </strong>{' '}
            the market average.
          </p>
        </div>
      ) : null}
    </Card>
  );
};

export default BenchmarkCard;
