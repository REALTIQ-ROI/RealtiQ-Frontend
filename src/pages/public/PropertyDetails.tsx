import { useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyGallery from '../../components/property/PropertyGallery';
import PropertyMeta from '../../components/property/PropertyMeta';
import InquiryForm from '../../components/forms/InquiryForm';
import Card from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import Button from '../../components/ui/Button';
import { useAsync } from '../../hooks/useAsync';
import { propertyService } from '../../services/propertyService';
import { inquiryService } from '../../services/inquiryService';
import { useAuth } from '../../contexts/AuthContext';
import { useProperties } from '../../contexts/PropertiesContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const PropertyDetails = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { buyProperty, refreshProperties } = useProperties();
  const { data: property, loading, error, execute } = useAsync(() => propertyService.getPropertyById(id), true);

  const handleBuyProperty = async () => {
    if (!user || user.role !== 'buyer' || !property) {
      navigate('/login-required');
      return;
    }

    try {
      await buyProperty(property._id, user._id);
      await execute();
      navigate('/payment-success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete purchase.';
      alert(message);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState label="Loading property details..." />
      </PublicLayout>
    );
  }

  if (error || !property) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Property not found</h1>
          <p className="text-secondary mb-6">We could not load this listing.</p>
          <Button onClick={() => navigate('/properties')}>Back to Listings</Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 space-y-10">
        <PropertyGallery property={property} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tighter text-primary mb-2">{property.title}</h1>
              <p className="text-xl text-secondary font-body mb-6">{property.location}</p>
              <PropertyMeta property={property} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Architectural Narrative</h2>
              <p className="text-on-surface-variant leading-relaxed">{property.description}</p>
            </div>

            {property.amenities?.length ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Curated Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {property.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <Card className="p-8 h-fit space-y-4">
            <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">List Price</p>
            <p className="text-4xl font-extrabold tracking-tighter">{formatCurrency(property.price)}</p>
            <div className="text-sm">
              Status:{' '}
              <span className={property.status === 'sold' ? 'text-error font-semibold' : 'text-green-700 font-semibold'}>
                {property.status.toUpperCase()}
              </span>
            </div>
            <Button fullWidth disabled={property.status === 'sold'} onClick={() => void handleBuyProperty()}>
              {property.status === 'sold' ? 'Already Sold' : 'Buy Property'}
            </Button>
            <InquiryForm
              propertyId={property._id}
              onSubmitInquiry={async (payload) => {
                await inquiryService.createInquiry(payload, user ?? undefined);
                await refreshProperties();
              }}
            />
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
};

export default PropertyDetails;