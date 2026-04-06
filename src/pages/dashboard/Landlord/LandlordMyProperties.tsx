import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordMyProperties = () => {
  const { user } = useAuth();
  const { properties, deleteProperty } = useProperties();

  const myProperties = properties.filter((item) => item.ownerId === user?._id);

  return (
    <DashboardLayout>
      <section className="space-y-5">
        <h1 className="text-3xl font-extrabold">My Properties</h1>
        {myProperties.map((property) => (
          <article key={property._id} className="rounded-xl border border-outline-variant/20 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold">{property.title}</p>
              <p className="text-secondary">{property.location}</p>
              <p className="text-sm mt-1">Status: {property.status}</p>
            </div>
            <div className="flex gap-2">
              <Link className="px-3 py-2 rounded bg-surface-container-low text-sm" to="/dashboard/landlord/edit-property">
                Edit
              </Link>
              <Button variant="secondary" onClick={() => void deleteProperty(property._id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
        {!myProperties.length ? <p className="text-secondary">No properties yet.</p> : null}
      </section>
    </DashboardLayout>
  );
};

export default LandlordMyProperties;