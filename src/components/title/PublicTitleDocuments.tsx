import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import StepUpDialog from '../auth/StepUpDialog';
import { titleDocumentService } from '../../services/titleDocumentService';
import type {
  PublicTitleDocument,
  TitleDocumentAccessStatus,
  TitleDocumentReference,
} from '../../types';
import { documentTypeLabel, titleStatusClasses } from '../../utils/titleVerification';
import Button from '../ui/Button';
import Card from '../ui/Card';

const formatNaira = (amount: number | null) =>
  amount === null
    ? 'Price unavailable'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

interface PublicTitleDocumentsProps {
  propertyId: string;
  onDocumentsLoaded?: (documents: PublicTitleDocument[]) => void;
  registryReferences?: TitleDocumentReference[];
}

const PublicTitleDocuments = ({
  propertyId,
  onDocumentsLoaded,
  registryReferences,
}: PublicTitleDocumentsProps) => {
  const { activeProfile } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PublicTitleDocument[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TitleDocumentAccessStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [checkoutIntent, setCheckoutIntent] = useState<{ documentId: string; redirectUrl: string; amountMinor: number; currency: string; expiresAt?: string | null } | null>(null);
  const [checkoutUnavailable, setCheckoutUnavailable] = useState<Record<string, boolean>>({});
  const [checkoutNeedsReview, setCheckoutNeedsReview] = useState<Record<string, boolean>>({});
  const paymentStepUp = useBoundStepUp<Awaited<ReturnType<typeof titleDocumentService.initializePayment>>>();

  useEffect(() => {
    setCheckoutIntent(null);
    setPaymentActionId(null);
    setStatuses({});
    setCheckoutUnavailable({});
    setCheckoutNeedsReview({});
  }, [activeProfile?.id]);

  const refreshStatus = useCallback(async (documentId: string) => {
    try {
      const status = await titleDocumentService.accessStatus(documentId);
      setStatuses((current) => ({ ...current, [documentId]: status }));
      if (status.purchaseState === 'active' && status.hasAccess) { setCheckoutIntent((current) => current?.documentId === documentId ? null : current); setCheckoutNeedsReview((current) => ({ ...current, [documentId]: false })); }
      return status;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setDocuments([]);
    setStatuses({});
    titleDocumentService.listPublic(propertyId)
      .then(async (result) => {
        if (!active) return;
        setDocuments(result);
        onDocumentsLoaded?.(result);
        const available = result.filter((document) =>
          document.accessMode !== 'private' && ['approved', 'published'].includes(document.verificationStatus),
        );
        const entries = await Promise.all(available.map(async (document) => [document.id, await titleDocumentService.accessStatus(document.id)] as const));
        if (active) setStatuses(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!active) return;
        onDocumentsLoaded?.([]);
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
          setLoadError('Title-document metadata is not available for this listing.');
          return;
        }
        setLoadError('Title-document metadata could not be loaded. Property details are still available.');
        toast.error(error instanceof Error ? error.message : 'Unable to load title documents.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeProfile?.id, onDocumentsLoaded, propertyId]);

  const openViewer = async (document: PublicTitleDocument) => {
    if (busyId) return;
    setBusyId(document.id);
    try {
      const currentStatus = await titleDocumentService.accessStatus(document.id);
      setStatuses((current) => ({ ...current, [document.id]: currentStatus }));
      const isPaid = ['paid_view_once', 'paid_view_multiple'].includes(document.accessMode);
      if (!currentStatus.hasAccess || (isPaid && currentStatus.purchaseState !== 'active')) throw new Error('The server has not confirmed current access for this document.');
      const session = await titleDocumentService.openViewer(document.id);
      navigate('/protected-title-viewer', {
        state: { session, documentId: document.id, propertyId, mode: currentStatus.mode },
      });
    } catch (error) {
      const nextStatus = await refreshStatus(document.id);
      toast.error(error instanceof Error ? error.message : 'Unable to open the protected viewer.');
      if (!nextStatus?.paymentRequired) return;
    } finally {
      setBusyId(null);
    }
  };

  const startPayment = async (document: PublicTitleDocument) => {
    if (busyId || paymentActionId || paymentStepUp.challenge) return;
    setPaymentActionId(document.id);
    const started = await paymentStepUp.begin({
      method: 'POST', path: `/api/title-documents/${encodeURIComponent(document.id)}/initialize-view-payment`, body: {},
      label: 'Request secure payment for this title document',
      execute: (challengeId) => titleDocumentService.initializePayment(document.id, challengeId),
    });
    if (!started) setPaymentActionId(null);
  };

  const completePaymentStepUp = async (code: string): Promise<boolean> => {
    const result = await paymentStepUp.complete(code);
    if (!result.ok) {
      const gated = Boolean(result.code && /^(FEATURE_MONNIFY_|FEATURE_PAYSTACK_)/.test(result.code));
      if (gated && paymentActionId) setCheckoutUnavailable((current) => ({ ...current, [paymentActionId]: true }));
      if (!gated && paymentActionId) setCheckoutNeedsReview((current) => ({ ...current, [paymentActionId]: true }));
      const recoverableCode = ['DOCUMENT_CHECKOUT_PENDING', 'DOCUMENT_CHECKOUT_LEGACY_RECOVERY_REQUIRED', 'PAYMENT_PROVIDER_UNAVAILABLE', 'PAYMENT_PROVIDER_RESPONSE_INVALID'].includes(result.code ?? '');
      toast.error(gated ? 'Title-document checkout is currently unavailable. Contact support; do not repeat the payment request.' : recoverableCode ? 'The existing checkout needs a status check or reconciliation. Do not start another payment.' : result.error ?? 'The payment request could not be confirmed.');
      if (paymentActionId) await refreshStatus(paymentActionId);
      setPaymentActionId(null);
      return false;
    }
    const documentId = paymentActionId;
    setPaymentActionId(null);
    if (!documentId) return true;
    const response = result.value;
    if (response.hasAccess && response.purchaseState === 'active') {
      await refreshStatus(documentId);
      toast.success('The server confirms that this Buyer profile already has document access.');
      return true;
    }
    if (response.purchaseState === 'checkout_ready' && response.nextAction === 'redirect_to_provider' && response.redirectUrl && response.reference && Number.isFinite(response.amountMinor) && response.currency) {
      try {
        const redirect = new URL(response.redirectUrl);
        if (redirect.protocol !== 'https:') throw new Error('Checkout did not return a secure provider address.');
        titleDocumentService.persistPendingPayment(documentId, propertyId, response.reference, activeProfile?.id);
        setCheckoutUnavailable((current) => ({ ...current, [documentId]: false }));
        setCheckoutNeedsReview((current) => ({ ...current, [documentId]: false }));
        setCheckoutIntent({ documentId, redirectUrl: redirect.href, amountMinor: response.amountMinor!, currency: response.currency, expiresAt: response.expiresAt });
        return true;
      } catch (raw) {
        await refreshStatus(documentId);
        toast.error(raw instanceof Error ? raw.message : 'Checkout is ready but its redirect cannot be opened. Check access status before retrying.');
        return false;
      }
    }
    await refreshStatus(documentId);
    toast.info('No new checkout was started. Refresh the server access status before taking another payment action.');
    return true;
  };

  const continueCheckout = () => {
    if (!checkoutIntent) return;
    try {
      const url = new URL(checkoutIntent.redirectUrl);
      if (url.protocol !== 'https:') throw new Error('The server returned an invalid secure checkout address.');
      window.location.assign(url.href);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The checkout cannot be opened. Refresh access status before retrying.'); }
  };

  const requestAccess = async (document: PublicTitleDocument) => {
    if (requestingId || busyId) return;
    setRequestingId(document.id);
    try {
      const request = await titleDocumentService.requestAccess(document.id);
      setStatuses((current) => ({ ...current, [document.id]: { ...current[document.id], hasAccess: false, requestState: request.state, canRequest: false } }));
      toast.success(`Access request ${request.state}.`);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to request document access.');
      if (raw instanceof ApiRequestError && raw.status === 409) await refreshStatus(document.id);
    } finally {
      setRequestingId(null);
    }
  };

  if (loading) return <p className="text-sm text-secondary">Loading verified title documents...</p>;
  if (loadError) return <p role="status" className="text-sm text-secondary">{loadError}</p>;
  if (documents.length === 0) return <p className="text-sm text-secondary">No buyer-viewable title-document metadata is available.</p>;

  return (
    <div className="grid gap-4">
      {documents.map((document) => {
        const registryReference = registryReferences?.find((reference) =>
          reference.publicReference === document.publicReference ||
          reference.documentType === document.documentType,
        );
        const publicVerificationId =
          document.publicVerificationId || registryReference?.publicVerificationId;
        const status = statuses[document.id];
        const available = ['approved', 'published'].includes(document.verificationStatus);
        const consumed = status?.mode === 'view_once' && status.viewed && status.remainingViews === 0;
        const isPaid = ['paid_view_once', 'paid_view_multiple'].includes(document.accessMode);
        const canOpen = available && status?.hasAccess && (!isPaid || status.purchaseState === 'active');
        const paymentRequired = available && isPaid && status?.paymentRequired;
        const uncertainPurchase = ['pending', 'processing', 'checkout_ready', 'reconciliation_required', 'unknown'].includes(status?.purchaseState ?? '');
        const canPay = paymentRequired && activeProfile?.kind === 'buyer' && !uncertainPurchase && !checkoutUnavailable[document.id];
        const canResumeCheckout = status?.purchaseState === 'checkout_ready' && Boolean(status.checkout?.checkoutUrl) && activeProfile?.kind === 'buyer';
        const needsStatusReview = checkoutNeedsReview[document.id] === true;
        const canRequest = available && document.accessMode === 'on_request' && status?.canRequest === true && activeProfile?.kind === 'buyer';
        return (
          <Card key={document.id} className="p-5">
            {checkoutIntent?.documentId === document.id ? <div role="status" className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="font-bold">Secure checkout is ready</p><p className="mt-1 text-sm">Amount: <strong>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: checkoutIntent.currency }).format(checkoutIntent.amountMinor / 100)}</strong>{checkoutIntent.expiresAt ? ` · Expires ${new Date(checkoutIntent.expiresAt).toLocaleString()}` : ''}</p><p className="mt-1 text-xs text-secondary">Access remains locked until the server confirms the payment and document version.</p><Button className="mt-3" type="button" onClick={continueCheckout}>Continue to secure checkout</Button></div> : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">{documentTypeLabel(document.documentType)}</p>
                <h3 className="mt-1 font-bold">{document.title}</h3>
                {document.publicReference ? <p className="mt-1 text-xs text-secondary">{document.publicReference}</p> : null}
                {document.verificationStatus === 'published' && publicVerificationId ? (
                  <p className="mt-2 text-xs text-secondary">
                    Registry ID:{' '}
                    <Link
                      className="font-bold text-primary hover:underline"
                      to={`/title-verification/${publicVerificationId}`}
                    >
                      {publicVerificationId}
                    </Link>
                  </p>
                ) : null}
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${titleStatusClasses(document.verificationStatus)}`}>
                {document.verificationStatus.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-secondary">
              <span>{document.accessMode === 'private' ? 'Private' : document.accessMode === 'on_request' ? 'On request' : document.accessMode === 'paid_view_once' ? 'Paid - one viewer session' : 'Paid - reusable access'}</span>
              {document.price !== null ? <span>{formatNaira(document.price)} set by RealtIQ</span> : null}
              {status?.viewCount !== undefined ? <span>{status.viewCount} viewer sessions started</span> : null}
            </div>
            {!available ? <p className="mt-4 text-sm text-secondary">Not available for viewing.</p> : null}
            {document.accessMode === 'private' ? <p className="mt-4 text-sm text-secondary">Private document - paid purchase is unavailable.</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {canOpen ? (
                <Button type="button" disabled={busyId === document.id} onClick={() => void openViewer(document)}>
                  {busyId === document.id ? 'Opening...' : 'Open protected viewer'}
                </Button>
              ) : null}
              {canPay ? (
                <Button type="button" disabled={paymentStepUp.busy || Boolean(paymentStepUp.challenge) || paymentActionId === document.id} onClick={() => void startPayment(document)}>
                  {paymentStepUp.busy || paymentActionId === document.id ? 'Confirming…' : consumed ? 'Purchase another view' : `Pay ${formatNaira(status.price ?? document.price)} to view`}
                </Button>
              ) : null}
              {canResumeCheckout ? <Button type="button" variant="secondary" disabled={busyId === document.id} onClick={() => { try { const url = new URL(status!.checkout!.checkoutUrl!); if (url.protocol !== 'https:') throw new Error('The server returned an invalid secure checkout link.'); window.location.assign(url.href); } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The existing checkout cannot be opened.'); } }}>Continue existing checkout</Button> : null}
              {paymentRequired && activeProfile?.kind === 'buyer' && uncertainPurchase && !canResumeCheckout ? <Button type="button" variant="secondary" disabled={busyId === document.id} onClick={() => { setBusyId(document.id); void refreshStatus(document.id).finally(() => setBusyId(null)); }}>Check existing payment status</Button> : null}
              {needsStatusReview && !uncertainPurchase && !canResumeCheckout ? <Button type="button" variant="secondary" disabled={busyId === document.id} onClick={() => { setBusyId(document.id); void refreshStatus(document.id).then((next) => { if (next && ['not_started', 'failed'].includes(next.purchaseState ?? '')) { setCheckoutNeedsReview((current) => ({ ...current, [document.id]: false })); setCheckoutUnavailable((current) => ({ ...current, [document.id]: false })); } }).finally(() => setBusyId(null)); }}>Check existing payment status</Button> : null}
              {canRequest ? <Button type="button" variant="secondary" disabled={requestingId === document.id} onClick={() => void requestAccess(document)}>{requestingId === document.id ? 'Requesting…' : 'Request access'}</Button> : null}
              {document.accessMode === 'on_request' && status?.requestState && status.requestState !== 'none' ? (
                <span role="status" className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-bold">Request {status.requestState.replaceAll('_', ' ')}</span>
              ) : null}
              {(paymentRequired || document.accessMode === 'on_request') && activeProfile?.kind !== 'buyer' ? (
                <span className="text-xs text-secondary">Sign in with a buyer profile to request secure document access.</span>
              ) : null}
              {status?.pricingState === 'unavailable' ? <span role="status" className="text-xs text-secondary">Secure payment is currently unavailable.</span> : null}
              {status?.purchaseState === 'reconciliation_required' ? <span role="status" className="text-xs text-secondary">Payment needs reconciliation. Check this same status or contact support; do not start another checkout.</span> : null}
              {checkoutUnavailable[document.id] ? <span role="status" className="text-xs text-secondary">Checkout is unavailable for this document right now. Contact support before trying again.</span> : null}
              {needsStatusReview ? <span role="status" className="text-xs text-secondary">A previous request may have reached the server. Check this same status before another checkout attempt.</span> : null}
              {document.accessMode === 'on_request' && !status?.canRequest && !status?.requestState ? <span className="text-xs text-secondary">Access requests are unavailable for the current profile.</span> : null}
              {status?.message ? <p className="w-full text-sm text-secondary">{status.message}</p> : null}
            </div>
          </Card>
        );
      })}
      <StepUpDialog challenge={paymentStepUp.challenge} busy={paymentStepUp.busy} error={paymentStepUp.error} onCancel={() => { paymentStepUp.cancel(); setPaymentActionId(null); }} onSubmit={completePaymentStepUp} />
    </div>
  );
};

export default PublicTitleDocuments;
