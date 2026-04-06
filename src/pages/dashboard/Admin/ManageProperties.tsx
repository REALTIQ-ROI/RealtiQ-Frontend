import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useProperties } from '../../../contexts/PropertiesContext';

const ManageProperties = () => {
  const { properties, updateProperty, deleteProperty } = useProperties();

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Manage Properties</h1>
        <div className="mt-6 space-y-3">
          {properties.map((property) => (
            <article key={property._id} className="rounded-xl border border-outline-variant/20 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{property.title}</p>
                <p className="text-sm text-secondary">{property.location}</p>
                <p className="text-xs uppercase">{property.status}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void updateProperty(property._id, { featured: !property.featured })}
                >
                  {property.featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button variant="secondary" onClick={() => void deleteProperty(property._id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ManageProperties;