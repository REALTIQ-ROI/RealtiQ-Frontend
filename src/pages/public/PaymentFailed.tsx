import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const PaymentFailed = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Payment Failed"
        description="We could not complete your payment. Please try again."
        actionLabel="Retry Checkout"
        actionTo="/checkout"
      />
    </PublicLayout>
  );
};

export default PaymentFailed;