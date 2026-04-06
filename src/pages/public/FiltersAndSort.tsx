import PublicLayout from '../../components/layout/PublicLayout';
import PageNotice from '../../components/ui/PageNotice';

const FiltersAndSort = () => {
  return (
    <PublicLayout>
      <PageNotice
        title="Filters & Sort"
        description="Advanced filter controls are available from the main listings page."
        actionLabel="Open Listings"
        actionTo="/properties"
      />
    </PublicLayout>
  );
};

export default FiltersAndSort;