import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordMyProperties = () => {
  const { user } = useAuth();
  const { properties, deleteProperty } = useProperties();

  const myProperties = properties.filter((item) => item.ownerId === user?._id);

  return (
    <LandlordPortalLayout active="my-properties" title="My Properties">
      <main className="p-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-label text-secondary mb-2">
            <span className="uppercase tracking-widest text-[10px]">Portal</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="uppercase tracking-widest text-[10px] text-primary font-bold">My Properties</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2">Property Portfolio</h1>
              <p className="text-secondary max-w-md">Manage your architectural collection and monitor performance.</p>
            </div>
            <Link to="/dashboard/landlord/add-property" className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md font-bold">
              <span className="material-symbols-outlined text-xl">add</span>
              <span>List New Property</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Property Details</th>
                <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {myProperties.map((property) => (
                <tr key={property._id} className="group hover:bg-surface-bright transition-colors">
                  <td className="px-6 py-5">
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{property.title}</h3>
                    <p className="text-sm text-secondary">{property.location}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {property.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-slate-900">${property.price.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all" to="/dashboard/landlord/property-details">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </Link>
                      <Link className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all" to="/dashboard/landlord/edit-property">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </Link>
                      <button
                        className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-all"
                        onClick={() => void deleteProperty(property._id)}
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordMyProperties;
