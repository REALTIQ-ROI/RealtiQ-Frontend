import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import { requiresInstallments } from '../../utils/installment';

type CheckoutStage = 'ready' | 'installment-only' | 'blocked';

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
    if (requiresInstallments(loadedProperty.price)) {
      return 'installment-only';
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

  if (hasInvalidRole || error || stage === 'blocked' || stage === 'installment-only') {
    return (
      <PublicLayout>
        <PageNotice
          title={stage === 'installment-only' ? 'Installments Only' : 'Checkout Unavailable'}
          description={
            stage === 'installment-only'
              ? 'This property is above the one-time payment limit. Please use an installment plan instead.'
              : error ?? 'Only buyers can purchase properties.'
          }
          actionLabel={stage === 'installment-only' ? 'Open Property' : 'Back to Properties'}
          actionTo={stage === 'installment-only' && propertyId ? `/properties/${propertyId}` : '/properties'}
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
