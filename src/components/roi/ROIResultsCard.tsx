import Card from '../ui/Card';
import type { ROICalculationResults } from '../../services/roiService';
import { formatNaira, formatPercent, formatUsd } from './roiFormatters';

interface ROIResultsCardProps {
  results: ROICalculationResults | null;
  loading?: boolean;
}

const ROIResultsCard = ({ results, loading = false }: ROIResultsCardProps) => {
  if (loading) {
    return (
      <Card className="p-5 space-y-4">
        <div className="h-5 w-40 rounded bg-surface-container-low animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg bg-surface-container-low animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-secondary">monitoring</span>
        <h2 className="text-xl font-bold mt-2">Run a calculation</h2>
        <p className="text-sm text-secondary mt-1">Validated ROI results will appear here.</p>
      </Card>
    );
  }

  const metrics = [
    { label: 'Annual Target ROI', value: formatPercent(results.annualTargetROI, 2), icon: 'trending_up' },
    { label: 'Final Selling Price', value: formatNaira(results.finalSellingPrice), icon: 'sell' },
    { label: 'Final Profit', value: formatNaira(results.finalProfit), icon: 'payments' },
    { label: 'Required for USD Target', value: formatNaira(results.requiredNairaForUsdTarget), icon: 'currency_exchange' },
    { label: 'Entry USD Value', value: formatUsd(results.entryUsdValue), icon: 'attach_money' },
    { label: 'Duration', value: `${results.monthsDiff} months`, icon: 'date_range' },
  ];

  return (
    <Card className="p-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-secondary font-bold">ROI Results</p>
        <h2 className="text-2xl font-extrabold">{formatPercent(results.annualTargetROI, 2)} target return</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-4">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-base">{metric.icon}</span>
              <p className="text-xs uppercase tracking-wider">{metric.label}</p>
            </div>
            <p className="text-lg font-black mt-2 break-words">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-surface-container-low p-4 text-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <p><span className="text-secondary">Base hurdle:</span> <strong>{formatPercent(results.baseHurdle, 2)}</strong></p>
        <p><span className="text-secondary">MPR adjustment:</span> <strong>{formatPercent(results.mprAdjustment, 2)}</strong></p>
        <p><span className="text-secondary">Years:</span> <strong>{results.yearsDiff.toFixed(2)}</strong></p>
      </div>
    </Card>
  );
};

export default ROIResultsCard;
