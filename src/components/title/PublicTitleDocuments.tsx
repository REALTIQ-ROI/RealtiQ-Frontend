import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { ApiRequestError } from '../../lib/axios';
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
  const { user } = useAuth();
  const { addItem, refreshCart } = useCart();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PublicTitleDocument[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TitleDocumentAccessStatus>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const [guestEmailByDocument, setGuestEmailByDocument] = useState<Record<string, string>>({});

  const refreshStatus = useCallback(async (documentId: string) => {
    try {
      const status = await titleDocumentService.accessStatus(documentId);
      setStatuses((current) => ({ ...current, [documentId]: status }));
      return status;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
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
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load title documents.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onDocumentsLoaded, propertyId]);

  const openViewer = async (document: PublicTitleDocument) => {
    if (busyId) return;
    setBusyId(document.id);
    try {
      const session = await titleDocumentService.openViewer(document.id);
      await refreshStatus(document.id);
      navigate('/protected-title-viewer', {
        state: { session, documentId: document.id, propertyId, mode: statuses[document.id]?.mode },
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
    if (busyId) return;
    const email = guestEmailByDocument[document.id]?.trim();
    if (!user && !email) {
      toast.error('Enter an email for your guest receipt and support record.');
      return;
    }
    setBusyId(document.id);
    try {
      const result = await titleDocumentService.initializePayment(document.id, user ? undefined : email);
      if (result.access.status === 'active') {
        await refreshStatus(document.id);
        toast.success('Your document access is ready. Open it when you are ready to start the viewer session.');
        return;
      }
      if (result.redirectUrl) {
        titleDocumentService.persistPendingPayment(document.id, propertyId, result.reference);
        window.location.href = result.redirectUrl;
        return;
      }
      await refreshStatus(document.id);
      toast.info('Your payment is still processing. Continue the existing checkout when it becomes available.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to initialize document payment.');
    } finally {
      setBusyId(null);
    }
  };

  const addToCart = async (document: PublicTitleDocument) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: window.location.pathname } } });
      return;
    }
    if (user.role !== 'buyer') {
      toast.error('Only buyers can add service purchases to cart.');
      return;
    }
    setCartBusyId(document.id);
    try {
      await addItem({ itemType: 'title_document_view', resourceId: document.id });
      toast.success('Title document added to cart.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to add document to cart.');
      if (raw instanceof ApiRequestError && raw.existingAccess) await refreshStatus(document.id);
      if (raw instanceof ApiRequestError && raw.status === 409) void refreshCart();
    } finally {
      setCartBusyId(null);
    }
  };

  if (loading) return <p className="text-sm text-secondary">Loading verified title documents...</p>;
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
        const canOpen = available && status?.hasAccess;
        const canPay = available && document.accessMode !== 'private' && status?.paymentRequired;
        return (
          <Card key={document.id} className="p-5">
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
              <span>{document.accessMode === 'private' ? 'Private' : document.accessMode === 'paid_view_once' ? 'Paid - one viewer session' : 'Paid - reusable access'}</span>
              {document.price !== null ? <span>{formatNaira(document.price)} set by RealtiQ</span> : null}
              {status?.viewCount !== undefined ? <span>{status.viewCount} viewer sessions started</span> : null}
            </div>
            {!available ? <p className="mt-4 text-sm text-secondary">Not available for viewing.</p> : null}
            {document.accessMode === 'private' ? <p className="mt-4 text-sm text-secondary">Private document - paid purchase is unavailable.</p> : null}
            {!user && canPay ? (
              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary">Guest email</label>
                <input
                  type="email"
                  value={guestEmailByDocument[document.id] ?? ''}
                  onChange={(event) => setGuestEmailByDocument((current) => ({ ...current, [document.id]: event.target.value }))}
                  className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none"
                  placeholder="guest@example.com"
                />
                <p className="mt-2 text-xs text-secondary">
                  Access is tied to this browser's secure HttpOnly cookie. Closing the browser does not consume access, but clearing browser data or changing browsers can remove the identity. Email is for receipts and support; email alone cannot automatically restore access in this release.
                </p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {canOpen ? (
                <Button type="button" disabled={busyId === document.id} onClick={() => void openViewer(document)}>
                  {busyId === document.id ? 'Opening...' : 'Open protected viewer'}
                </Button>
              ) : null}
              {canPay ? (
                <Button type="button" disabled={busyId === document.id} onClick={() => void startPayment(document)}>
                  {busyId === document.id ? 'Please wait...' : consumed ? 'Purchase another view' : `Pay ${formatNaira(status.price ?? document.price)} to view`}
                </Button>
              ) : null}
              {canPay && user?.role === 'buyer' ? (
                <Button type="button" variant="secondary" disabled={cartBusyId === document.id} onClick={() => void addToCart(document)}>
                  {cartBusyId === document.id ? 'Adding...' : 'Add to Cart'}
                </Button>
              ) : null}
              {status?.message ? <p className="w-full text-sm text-secondary">{status.message}</p> : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default PublicTitleDocuments;
