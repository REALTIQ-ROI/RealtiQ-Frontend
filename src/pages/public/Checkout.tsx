import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import { normalizePropertyPaymentTypes } from '../../utils/propertyPaymentTypes';

type CheckoutStage = 'ready' | 'outright-unavailable' | 'blocked';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const propertyId = searchParams.get('propertyId') ?? paymentService.getPendingPaymentPropertyId();
  const hasInvalidRole = Boolean(isAuthenticated && user && user.role !== 'buyer');

  const { data: stage, loading, error } = useAsync<CheckoutStage>(async () => {
    if (!propertyId) {
      return 'blocked';
    }

    if (!isAuthenticated) {
      paymentService.persistPendingPaymentProperty(propertyId);
      navigate('/login-to-purchase');
      return 'blocked';
    }

    if (hasInvalidRole) {
      toast.error('Only buyers can purchase properties.');
      return 'blocked';
    }

    const loadedProperty = await propertyService.getPropertyById(propertyId);
    if (
      loadedProperty.status !== 'available' ||
      (loadedProperty.approvalStatus && loadedProperty.approvalStatus !== 'approved')
    ) {
      return 'blocked';
    }
    if (!normalizePropertyPaymentTypes(loadedProperty.paymentTypes, loadedProperty.price).includes('outright')) {
      return 'outright-unavailable';
    }

    const checkout = await paymentService.initializePayment(propertyId);
    paymentService.redirectToCheckout(checkout, propertyId);
    return 'ready';
  }, Boolean(propertyId));

  if (!propertyId) {
    return (
      <PublicLayout>
        <PageNotice
          title="Checkout"
          description="Select a property before starting checkout."
          actionLabel="Browse Properties"
          actionTo="/properties"
        />
      </PublicLayout>
    );
  }

  if (hasInvalidRole || error || stage === 'blocked' || stage === 'outright-unavailable') {
    return (
      <PublicLayout>
        <PageNotice
          title={stage === 'outright-unavailable' ? 'Outright Payment Unavailable' : 'Checkout Unavailable'}
          description={
            stage === 'outright-unavailable'
              ? 'The landlord has not offered outright payment for this property. Return to the property to choose an available payment option.'
              : error ?? 'Only buyers can purchase properties.'
          }
          actionLabel={stage === 'outright-unavailable' ? 'Open Property' : 'Back to Properties'}
          actionTo={stage === 'outright-unavailable' && propertyId ? `/properties/${propertyId}` : '/properties'}
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <LoadingState label={loading ? 'Checking payment eligibility...' : 'Initializing Payment...'} />
    </PublicLayout>
  );
};

export default Checkout;
