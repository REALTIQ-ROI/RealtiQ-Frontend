import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const Checkout = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Checkout"
        description="Payment flow UI is prepared. Connect this screen to /payments when backend is ready."
        actionLabel="Continue Browsing"
        actionTo="/properties"
      />
    </PublicLayout>
  );
};

export default Checkout;