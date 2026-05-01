import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropertyForm from '../../components/property/PropertyForm';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthLoader from '../../components/common/AuthLoader';
import { propertyService, type CreatePropertyPayload } from '../../services/propertyService';
import { useProperties } from '../../hooks/useProperties';
import type { Property } from '../../types';

const EditProperty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateProperty } = useProperties();
  const [property, setProperty] = useState<Property | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    propertyService
      .getPropertyById(id)
      .then((p) => setProperty(p))
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Property not found.');
      })
      .finally(() => setFetchLoading(false));
  }, [id]);

  const handleSubmit = async (data: CreatePropertyPayload & { status?: string }) => {
    if (!id) return;
    setIsLoading(true);
    const ok = await updateProperty(id, data);
    setIsLoading(false);
    if (ok) {
      navigate('/properties/success', {
        state: { action: 'update', propertyId: id },
        replace: true,
      });
    }
  };

  if (fetchLoading) return <AuthLoader />;

  if (fetchError || !property) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
          <p className="text-lg font-bold text-slate-700 mb-2">Property not found</p>
          <p className="text-slate-500 text-sm mb-6">{fetchError}</p>
          <Link
            to="/dashboard/landlord/my-properties"
            className="px-6 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
          >
            Back to My Properties
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const initialData: Partial<CreatePropertyPayload & { status: string }> = {
    title: property.title,
    price: property.price,
    location: property.location,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareFeet: property.squareFeet,
    description: property.description,
    amenities: property.amenities ?? [],
    media: property.media,
    status: property.status,
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="mb-8">
          <Link
            to={`/properties/${id}`}
            className="inline-flex items-center gap-1 text-secondary text-sm hover:text-primary transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            View Property
          </Link>
          <h1
            className="text-2xl font-extrabold text-on-surface tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Edit Property
          </h1>
          <p className="text-secondary text-sm mt-1 truncate">{property.title}</p>
        </div>

        <PropertyForm
          mode="edit"
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Save Changes"
        />
      </div>
    </DashboardLayout>
  );
};

export default EditProperty;
