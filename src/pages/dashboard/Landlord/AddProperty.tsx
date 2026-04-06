import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import PropertyForm from '../../../components/forms/PropertyForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const AddProperty = () => {
  const { user } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Add Property</h1>
        <PropertyForm
          submitLabel="Create Property"
          onSubmit={async (payload) => {
            if (!user) return;
            await addProperty(user._id, payload);
            navigate('/dashboard/landlord/my-properties');
          }}
        />
      </section>
    </DashboardLayout>
  );
};

export default AddProperty;