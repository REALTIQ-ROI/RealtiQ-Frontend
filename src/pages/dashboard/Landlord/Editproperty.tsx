import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyForm from '../../../components/property/PropertyForm';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { UpdatePropertyPayload } from '../../../services/propertyService';
import { propertyRouteReference, resolvePropertyOwnerId } from '../../../types';

const Editproperty = () => {
  const { user } = useAuth();
  const { properties, updateProperty } = useProperties();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const property = useMemo(() => {
    if (id) return properties.find((item) => propertyRouteReference(item) === id || item._id === id || item.id === id) ?? null;
    return properties.find((item) => resolvePropertyOwnerId(item) === user?._id) ?? null;
  }, [properties, user, id]);

  const handleSubmit = async (payload: UpdatePropertyPayload & { status?: string }) => {
    if (!property) {
      toast.error('Property not found.');
      return;
    }

    const success = await updateProperty(propertyRouteReference(property), payload);
    if (success) {
      toast.success('Property updated successfully');
      navigate('/dashboard/landlord/my-properties');
    }
  };

  return (
    <LandlordPortalLayout active="my-properties" title="Edit Listing">
      <div className="p-8 lg:p-12 bg-surface min-h-screen">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 mb-4 text-secondary text-xs font-semibold tracking-widest uppercase">
              <span>Properties</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Edit Listing</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-primary tracking-tighter mb-2">
              {property?.title ?? 'Edit Property'}
            </h1>
            <p className="text-secondary">
              {property ? `Editing property: ${propertyRouteReference(property)}` : 'Loading property data...'}
            </p>
          </div>
          <button
            className="px-6 py-3 bg-surface-container-low text-on-surface font-semibold rounded-md hover:bg-surface-container transition-colors"
            type="button"
            onClick={() => navigate('/dashboard/landlord/my-properties')}
          >
            Back
          </button>
        </header>

        {property ? (
          <PropertyForm
            initialData={property}
            mode="edit"
            submitLabel="Save Changes"
            onSubmit={handleSubmit}
          />
        ) : (
          <LoadingState label="Loading property..." />
        )}
      </div>
    </LandlordPortalLayout>
  );
};

export default Editproperty;
