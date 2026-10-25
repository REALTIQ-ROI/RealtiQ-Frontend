import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';
import { paymentService } from '../../services/paymentService';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId') ?? paymentService.getPendingPaymentPropertyId();

  return (
    <PublicLayout>
      <PageNotice
        title={propertyId ? 'Outright checkout unavailable' : 'Checkout'}
        description={propertyId
          ? 'Property checkout requires the server checkout and step-up challenge contract before payment can start. Your property selection has been retained.'
          : 'Select a property before starting checkout.'}
        actionLabel={propertyId ? 'Open Property' : 'Browse Properties'}
        actionTo={propertyId ? `/properties/${encodeURIComponent(propertyId)}` : '/properties'}
      />
    </PublicLayout>
  );
};

export default Checkout;
