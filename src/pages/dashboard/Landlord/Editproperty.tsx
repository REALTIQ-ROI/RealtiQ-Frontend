import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import PropertyForm from '../../../components/forms/PropertyForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const Editproperty = () => {
  const { user } = useAuth();
  const { properties, updateProperty } = useProperties();
  const navigate = useNavigate();

  const property = properties.find((item) => item.ownerId === user?._id) ?? null;

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Edit Property</h1>
        {property ? (
          <PropertyForm
            initialValue={property}
            submitLabel="Update Property"
            onSubmit={async (payload) => {
              await updateProperty(property._id, payload);
              navigate('/dashboard/landlord/my-properties');
            }}
          />
        ) : (
          <p className="text-secondary">No property available to edit.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default Editproperty;