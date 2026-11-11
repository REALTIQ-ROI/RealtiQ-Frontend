import { Link } from 'react-router-dom';

interface BuyerKycNoticeProps {
  status?: string | null;
}

const BuyerKycNotice = ({ status }: BuyerKycNoticeProps) => {
  const normalizedStatus = status?.trim().toLowerCase() ?? '';
  if (normalizedStatus === 'approved') return null;

  const submitted = ['submitted', 'under_review', 'pending'].includes(normalizedStatus);
  const rejected = normalizedStatus === 'rejected';
  const knownNotSubmitted = ['', 'not_submitted', 'draft'].includes(normalizedStatus);
  const heading = submitted ? 'Your KYC is waiting for review' : rejected ? 'Your KYC needs attention' : knownNotSubmitted ? 'Complete your KYC' : 'Check your KYC status';
  const description = submitted
    ? 'Your verification case has been submitted. Approval is complete only when the reviewer decision is approved.'
    : rejected
      ? 'Review the latest verification decision and the next steps on your KYC page.'
      : knownNotSubmitted
        ? 'Your identity verification is not yet approved. Continue on the KYC page to complete the required steps.'
        : 'We could not confirm your current KYC state. Open the KYC page to refresh your status.';

  return (
    <section aria-labelledby="buyer-kyc-notice-title" role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-amber-700" aria-hidden="true">info</span>
        <div>
          <h2 id="buyer-kyc-notice-title" className="font-bold">{heading}</h2>
          <p className="mt-1 text-sm">{description}</p>
        </div>
      </div>
      <Link className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900" to="/dashboard/verification">
        {submitted ? 'View KYC status' : rejected ? 'Review KYC' : 'Complete verification'}
      </Link>
    </section>
  );
};

export default BuyerKycNotice;
