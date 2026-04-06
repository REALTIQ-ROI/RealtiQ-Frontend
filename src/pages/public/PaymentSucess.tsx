import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const PaymentSucess = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Payment Successful"
        description="Your payment has been confirmed successfully."
        actionLabel="View Dashboard"
        actionTo="/dashboard"
      />
    </PublicLayout>
  );
};

export default PaymentSucess;