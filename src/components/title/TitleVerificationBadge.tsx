import { Link } from 'react-router-dom';
import type {
  PropertyTitleVerificationStatus,
  PropertyTitleVerificationSummary,
  TitleVerificationStatus,
} from '../../types';
import { externalAnchorLabel, titleStatusClasses, titleStatusLabel } from '../../utils/titleVerification';

interface TitleDocumentVerificationItem {
  verificationStatus?: TitleVerificationStatus | PropertyTitleVerificationStatus | 'not_submitted';
}

interface TitleVerificationBadgeProps {
  summary?: PropertyTitleVerificationSummary | null;
  context?: 'public' | 'owner' | 'admin';
  documents?: TitleDocumentVerificationItem[];
}

const TitleVerificationBadge = ({
  summary,
  context = 'public',
  documents,
}: TitleVerificationBadgeProps) => {
  const status = summary?.status ?? 'not_submitted';
  const documentCount = documents?.length ?? 0;
  const verifiedDocumentCount =
    documents?.filter((document) =>
      document.verificationStatus === 'approved' ||
      document.verificationStatus === 'published',
    ).length ?? 0;
  const hasDocumentAggregate = documentCount > 0;
  const allDocumentsVerified =
    hasDocumentAggregate && verifiedDocumentCount === documentCount;
  const displayStatus = context === 'public' && status !== 'published' ? 'not_submitted' : status;
  const label = hasDocumentAggregate
    ? verifiedDocumentCount === 0
      ? documentCount === 1
        ? 'Title Document Not Verified'
        : `0 of ${documentCount} Title Documents Verified`
      : documentCount === 1
        ? 'Title Document Verified'
        : `${verifiedDocumentCount} of ${documentCount} Title Documents Verified`
    : context === 'public' && status !== 'published'
      ? 'Title Document Not Verified'
      : summary?.badgeLabel || titleStatusLabel(status);
  const badgeStatus = hasDocumentAggregate && verifiedDocumentCount > 0
    ? allDocumentsVerified ? 'published' : 'approved'
    : displayStatus;
  const content = (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${titleStatusClasses(badgeStatus)}`}>
      <span className="material-symbols-outlined text-sm">
        {verifiedDocumentCount > 0 ? 'check_circle' : 'verified'}
      </span>
      {label}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'published' &&
      summary?.publicVerificationId &&
      (!hasDocumentAggregate || documentCount === 1) ? (
        <Link to={`/title-verification/${summary.publicVerificationId}`} className="hover:opacity-85">
          {content}
        </Link>
      ) : (
        content
      )}
      {summary?.externalAnchorStatus === 'anchored' &&
      (!hasDocumentAggregate || documentCount === 1) ? (
        <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">
          {externalAnchorLabel(summary.externalAnchorStatus)}
        </span>
      ) : null}
    </div>
  );
};

export default TitleVerificationBadge;
