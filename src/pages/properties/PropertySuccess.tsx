import { Link, useLocation } from 'react-router-dom';

interface LocationState {
  action?: 'create' | 'update';
  propertyId?: string;
}

const PropertySuccess = () => {
  const { state } = useLocation() as { state?: LocationState };
  const isCreate = state?.action !== 'update';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl p-10 shadow-sm text-center">
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter text-slate-900 mb-8 block"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          RealtiQ
        </Link>

        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
        </div>

        <h1
          className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {isCreate ? 'Property Created' : 'Property Updated'}
        </h1>

        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          {isCreate
            ? 'Your property has been listed successfully and is now visible to buyers.'
            : 'Your changes have been saved successfully.'}
        </p>

        <div className="space-y-3">
          {state?.propertyId && (
            <Link
              to={`/properties/${state.propertyId}`}
              className="inline-block w-full py-4 rounded-xl text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
            >
              View Property
            </Link>
          )}
          <Link
            to="/dashboard/landlord/my-properties"
            className="inline-block w-full py-4 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm tracking-tight hover:bg-surface-container transition-colors"
          >
            My Properties
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertySuccess;
