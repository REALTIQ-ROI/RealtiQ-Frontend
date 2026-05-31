import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageNotice from '../../../components/ui/PageNotice';
import PublicLayout from '../../../components/layout/PublicLayout';
import ROICalculator from '../../../components/roi/ROICalculator';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { propertyService } from '../../../services/propertyService';

const PropertyROICalculatorPage = () => {
  const { propertyId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: property, loading, error, execute } = useAsync(() => propertyService.getPropertyById(propertyId), true);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current) {
      void execute();
    } else {
      hasMounted.current = true;
    }
  }, [execute, propertyId]);

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <PageNotice
          title="Login Required"
          description="Please login first to calculate ROI for this property."
          actionLabel="Go to Login"
          actionTo="/login"
        />
      </PublicLayout>
    );
  }

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState label="Loading ROI calculator..." />
      </PublicLayout>
    );
  }

  if (error || !property) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Property not found</h1>
          <p className="text-secondary mb-6">We could not load this listing for ROI analysis.</p>
          <Button onClick={() => navigate('/properties')}>Back to Listings</Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 py-10">
        <ROICalculator property={property} />
      </section>
    </PublicLayout>
  );
};

export default PropertyROICalculatorPage;
