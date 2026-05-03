import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { paymentService } from '../../services/paymentService';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const propertyId = searchParams.get('propertyId') ?? paymentService.getPendingPaymentPropertyId();
  const hasInvalidRole = Boolean(isAuthenticated && user && user.role !== 'buyer');
  const hasInitialized = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    if (!isAuthenticated) {
      paymentService.persistPendingPaymentProperty(propertyId);
      navigate('/login-to-purchase');
      return;
    }

    if (hasInvalidRole) {
      toast.error('Only buyers can purchase properties.');
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    paymentService
      .initializePayment(propertyId)
      .then((checkout) => paymentService.redirectToCheckout(checkout, propertyId))
      .catch(() => {
        hasInitialized.current = false;
        setError('Unable to initialize payment. Please try again.');
        toast.error('Unable to initialize payment. Please try again.');
      });
  }, [hasInvalidRole, isAuthenticated, navigate, propertyId]);

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

  if (hasInvalidRole || error) {
    return (
      <PublicLayout>
        <PageNotice
          title="Checkout Unavailable"
          description={error ?? 'Only buyers can purchase properties.'}
          actionLabel="Back to Properties"
          actionTo="/properties"
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <LoadingState label="Initializing Payment..." />
    </PublicLayout>
  );
};

export default Checkout;
