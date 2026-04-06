import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const FeaturedListingControl = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Featured Listing Control"
        description="Featured listing management is scaffolded for admin integration."
        actionLabel="Go to Dashboard"
        actionTo="/dashboard"
      />
    </PublicLayout>
  );
};

export default FeaturedListingControl;