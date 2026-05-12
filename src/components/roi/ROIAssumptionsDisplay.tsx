import Card from '../ui/Card';
import type { ROIAssumptions } from '../../services/roiService';
import { formatDate, formatPercent } from './roiFormatters';

interface ROIAssumptionsDisplayProps {
  assumptions: ROIAssumptions | null;
  loading?: boolean;
}

const metricLabels: Array<[keyof ROIAssumptions, string]> = [
  ['inflation', 'Inflation'],
  ['mmf', 'MMF'],
  ['mpr', 'MPR'],
  ['usdNgn', 'USD/NGN'],
  ['usInflation', 'US Inflation'],
  ['usTreasury', 'US Treasury'],
  ['defaultAlpha', 'Default Alpha'],
  ['defaultBeta', 'Default Beta'],
];

const ROIAssumptionsDisplay = ({ assumptions, loading = false }: ROIAssumptionsDisplayProps) => {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-bold">Current Assumptions</p>
          <h2 className="text-xl font-extrabold">ROI Defaults</h2>
        </div>
        <span className="text-xs text-secondary">Effective {formatDate(assumptions?.effectiveDate)}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricLabels.map(([, label]) => (
            <div key={label} className="h-20 rounded-lg bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : assumptions ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricLabels.map(([key, label]) => {
            const value = assumptions[key];
            const display = key === 'usdNgn' ? Number(value).toLocaleString() : formatPercent(Number(value), 2);
            return (
              <div key={key} className="rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-4">
                <p className="text-xs text-secondary uppercase tracking-wider">{label}</p>
                <p className="text-lg font-black mt-1">{display}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-secondary">No ROI assumptions are available yet.</p>
      )}
    </Card>
  );
};

export default ROIAssumptionsDisplay;
