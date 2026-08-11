import type { OffPlanSummary } from '../../types';
import { formatDate, formatNgn, labelize, offPlanStatusClasses } from '../../utils/projectFormatters';

const OffPlanBadges = ({ summary }: { summary?: OffPlanSummary }) => {
  if (!summary) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-on-primary">
        Off-Plan
      </span>
      {summary.developmentStatus ? (
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${offPlanStatusClasses[summary.developmentStatus] ?? 'bg-slate-100 text-slate-700'}`}>
          {labelize(summary.developmentStatus)}
        </span>
      ) : null}
      {typeof summary.constructionProgress === 'number' ? (
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-black uppercase tracking-wide">
          {summary.constructionProgress}% complete
        </span>
      ) : null}
      {summary.expectedCompletionDate ? (
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-black uppercase tracking-wide">
          Est. {formatDate(summary.expectedCompletionDate)}
        </span>
      ) : null}
      {summary.installmentAvailable ? (
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
          Plan from {formatNgn(summary.minimumInitialDeposit)}
        </span>
      ) : null}
    </div>
  );
};

export default OffPlanBadges;
