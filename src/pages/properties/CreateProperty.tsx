import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PropertyForm from '../../components/property/PropertyForm';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { propertyService, type CreatePropertyPayload } from '../../services/propertyService';

const CreateProperty = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CreatePropertyPayload & { status?: string }) => {
    setIsLoading(true);
    try {
      const created = await propertyService.createProperty(data);
      toast.success('Property created successfully');
      navigate('/properties/success', {
        state: { action: 'create', propertyId: created._id },
        replace: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create property.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div
        className="max-w-3xl mx-auto py-8 px-4"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/landlord/my-properties"
            className="inline-flex items-center gap-1 text-secondary text-sm hover:text-primary transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            My Properties
          </Link>
          <h1
            className="text-2xl font-extrabold text-on-surface tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            List a Property
          </h1>
          <p className="text-secondary text-sm mt-1">
            Fill in the details below to publish your listing.
          </p>
        </div>

        <PropertyForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Publish Listing"
        />
      </div>
    </DashboardLayout>
  );
};

export default CreateProperty;
