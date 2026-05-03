import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { Link, useParams } from 'react-router-dom';
import { resolveBuyerId } from '../../../types';

const PropertyDetails = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { id } = useParams();
  const ownedProperties = properties.filter((item) => resolveBuyerId(item.buyerId) === user?._id);
  const property = id ? ownedProperties.find((item) => item._id === id) ?? null : ownedProperties[0] ?? null;

  return (
    <DashboardLayout>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">Property Details</h1>
          <Link className="text-sm font-bold text-primary hover:underline" to="/dashboard/buyer/my-properties">
            Back to portfolio
          </Link>
        </div>
        {property ? (
          <article className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <h2 className="text-2xl font-bold">{property.title}</h2>
            <p className="text-secondary">{property.location}</p>
            <p>{property.description}</p>
            <div className="text-sm text-on-surface-variant">
              {property.bedrooms} beds • {property.bathrooms} baths • {property.squareFeet.toLocaleString()} sqft
            </div>
          </article>
        ) : (
          <p className="text-secondary">No purchased property selected.</p>
        )}
      </section>
    </DashboardLayout>
  );
};

export default PropertyDetails;
