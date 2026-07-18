import { Link } from 'react-router-dom';
import type { PropertyTitleVerificationSummary } from '../../types';
import { externalAnchorLabel, titleStatusClasses, titleStatusLabel } from '../../utils/titleVerification';

interface TitleVerificationBadgeProps {
  summary?: PropertyTitleVerificationSummary | null;
  context?: 'public' | 'owner' | 'admin';
}

const TitleVerificationBadge = ({ summary, context = 'public' }: TitleVerificationBadgeProps) => {
  const status = summary?.status ?? 'not_submitted';
  const displayStatus = context === 'public' && status !== 'published' ? 'not_submitted' : status;
  const label = context === 'public' && status !== 'published'
    ? 'Title Document Not Verified'
    : summary?.badgeLabel || titleStatusLabel(status);
  const content = (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${titleStatusClasses(displayStatus)}`}>
      <span className="material-symbols-outlined text-sm">verified</span>
      {label}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'published' && summary?.publicVerificationId ? (
        <Link to={`/title-verification/${summary.publicVerificationId}`} className="hover:opacity-85">
          {content}
        </Link>
      ) : (
        content
      )}
      {summary?.externalAnchorStatus === 'anchored' ? (
        <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">
          {externalAnchorLabel(summary.externalAnchorStatus)}
        </span>
      ) : null}
    </div>
  );
};

export default TitleVerificationBadge;
