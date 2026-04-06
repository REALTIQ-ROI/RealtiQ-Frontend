import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const Redirecting = () => {
  return (
    <PublicLayout>
      <PageNotice title="Redirecting" description="Please wait while we redirect you." actionLabel="Go Home" actionTo="/" />
    </PublicLayout>
  );
};

export default Redirecting;