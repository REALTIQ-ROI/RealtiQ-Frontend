import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordPropertyDetails = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const property = properties.find((item) => item.ownerId === user?._id) ?? null;

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Property Details</h1>
        {property ? (
          <article className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <h2 className="text-2xl font-bold">{property.title}</h2>
            <p className="text-secondary">{property.location}</p>
            <p>{property.description}</p>
            <p className="text-sm">Status: {property.status}</p>
          </article>
        ) : (
          <p className="text-secondary">No property available.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default LandlordPropertyDetails;