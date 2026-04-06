import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const PostPaymentRedirect = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Post Payment Redirect"
        description="You are being redirected to your dashboard."
        actionLabel="Continue"
        actionTo="/dashboard"
      />
    </PublicLayout>
  );
};

export default PostPaymentRedirect;