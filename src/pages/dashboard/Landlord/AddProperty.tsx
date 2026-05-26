import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyForm from '../../../components/property/PropertyForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { CreatePropertyPayload } from '../../../services/propertyService';

const AddProperty = () => {
  const { user } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();

  const handleSubmit = async (payload: CreatePropertyPayload & { status?: string }) => {
    if (!user) {
      toast.error('You must be logged in to create a property.');
      return;
    }

    const created = await addProperty(user._id, payload);
    if (created) {
      toast.success('Property listed successfully');
      navigate('/dashboard/landlord/my-properties');
    }
  };

  return (
    <LandlordPortalLayout active="add-property" title="New Property Listing">
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <nav className="flex mb-8 gap-2 text-sm font-medium text-secondary">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span>Properties</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span className="text-primary">Add New</span>
        </nav>

        <PropertyForm onSubmit={handleSubmit} submitLabel="Publish Property" />
      </div>
    </LandlordPortalLayout>
  );
};

export default AddProperty;
