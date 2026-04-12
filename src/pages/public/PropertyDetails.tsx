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
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);

const nearbyPlaces = [
  { icon: 'school', label: 'Top International School', distance: '0.8 km' },
  { icon: 'local_hospital', label: 'Premium Medical Centre', distance: '1.2 km' },
  { icon: 'shopping_bag', label: 'Luxury Shopping Mall', distance: '1.5 km' },
  { icon: 'restaurant', label: 'Fine Dining District', distance: '0.5 km' },
  { icon: 'local_airport', label: 'International Airport', distance: '22 km' },
];

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

  const pricePerSqft = Math.round(property.price / property.squareFeet);

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 space-y-10">
        <PropertyGallery property={property} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title & Meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  {property.propertyType}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                  property.status === 'sold' ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {property.status}
                </span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tighter text-primary mb-2">{property.title}</h1>
              <p className="text-xl text-secondary font-body mb-6 flex items-center gap-1">
                <span className="material-symbols-outlined text-xl">location_on</span>
                {property.location}
              </p>
              <PropertyMeta property={property} />
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold mb-3">Architectural Narrative</h2>
              <p className="text-on-surface-variant leading-relaxed">{property.description}</p>
            </div>

            {/* Key Details */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: 'bed', label: 'Bedrooms', value: property.bedrooms },
                  { icon: 'bathtub', label: 'Bathrooms', value: property.bathrooms },
                  { icon: 'square_foot', label: 'Total Area', value: `${property.squareFeet.toLocaleString()} sqft` },
                  { icon: 'home', label: 'Property Type', value: property.propertyType },
                  { icon: 'payments', label: 'Price / sqft', value: formatCurrency(pricePerSqft) },
                  { icon: 'inventory_2', label: 'Status', value: property.status.toUpperCase() },
                ].map((detail) => (
                  <div key={detail.label} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-1 text-secondary">
                      <span className="material-symbols-outlined text-base">{detail.icon}</span>
                      <p className="text-xs uppercase tracking-wider">{detail.label}</p>
                    </div>
                    <p className="font-bold text-sm">{detail.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {property.amenities?.length ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Curated Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {property.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-lowest rounded-lg px-4 py-3 border border-outline-variant/10">
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Virtual Tour CTA */}
            <div className="bg-primary rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-on-primary mb-1">Take a Virtual Tour</h3>
                <p className="text-on-primary/70 text-sm">Experience this property from the comfort of your home with our immersive 3D walkthrough.</p>
              </div>
              <Button variant="secondary" onClick={() => alert('Virtual tour coming soon')}>
                <span className="material-symbols-outlined text-sm mr-1">360</span>
                Start 3D Tour
              </Button>
            </div>

            {/* Location & Neighbourhood */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Location & Neighbourhood</h2>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
                {/* Map placeholder */}
                <div className="h-48 bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-secondary">map</span>
                    <p className="text-sm text-secondary mt-2">Interactive map — {property.location}</p>
                  </div>
                </div>
                <div className="p-6 divide-y divide-outline-variant/10">
                  {nearbyPlaces.map((place) => (
                    <div key={place.label} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="material-symbols-outlined text-base text-secondary">{place.icon}</span>
                        <span className="text-on-surface-variant">{place.label}</span>
                      </div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{place.distance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Investment Potential */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Investment Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-2xl text-primary mb-2 block">trending_up</span>
                  <p className="text-2xl font-black text-primary">12.4%</p>
                  <p className="text-xs text-secondary uppercase tracking-wider mt-1">Avg. Annual Appreciation</p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-2xl text-primary mb-2 block">currency_exchange</span>
                  <p className="text-2xl font-black text-primary">8.1%</p>
                  <p className="text-xs text-secondary uppercase tracking-wider mt-1">Rental Yield Potential</p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-2xl text-primary mb-2 block">verified</span>
                  <p className="text-2xl font-black text-primary">C of O</p>
                  <p className="text-xs text-secondary uppercase tracking-wider mt-1">Title Document</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Pricing & Actions */}
          <div className="space-y-6">
            <Card className="p-8 h-fit space-y-4 sticky top-24">
              <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">List Price</p>
              <p className="text-4xl font-extrabold tracking-tighter">{formatCurrency(property.price)}</p>
              <p className="text-xs text-secondary">{formatCurrency(pricePerSqft)} per sqft</p>
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

              {/* Agent Card */}
              <div className="pt-4 border-t border-outline-variant/20">
                <p className="text-xs text-secondary uppercase tracking-widest mb-3">Listed By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">RealtiQ Agent</p>
                    <p className="text-xs text-secondary">Verified Listing Specialist</p>
                  </div>
                </div>
                <a href="tel:+2341234567890" className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
                  <span className="material-symbols-outlined text-sm">call</span>
                  +234 123 456 7890
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default PropertyDetails;
