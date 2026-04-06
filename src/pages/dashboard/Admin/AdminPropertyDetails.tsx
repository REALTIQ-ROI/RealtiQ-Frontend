import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useProperties } from '../../../contexts/PropertiesContext';

const AdminPropertyDetails = () => {
  const { properties } = useProperties();
  const property = properties[0];

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold">Admin Property Details</h1>
        {property ? (
          <div className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <p><strong>Title:</strong> {property.title}</p>
            <p><strong>Location:</strong> {property.location}</p>
            <p><strong>Status:</strong> {property.status}</p>
            <p><strong>Owner:</strong> {property.ownerId}</p>
            <p><strong>Buyer:</strong> {property.buyerId ?? 'N/A'}</p>
          </div>
        ) : (
          <p className="text-secondary">No property found.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default AdminPropertyDetails;