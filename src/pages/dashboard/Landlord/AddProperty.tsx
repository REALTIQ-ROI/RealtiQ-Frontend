import { useAsync } from '../../../hooks/useAsync';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import PropertyForm from '../../../components/property/PropertyForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { userService } from '../../../services/userService';
import type { CreatePropertyPayload } from '../../../services/propertyService';

const AddProperty = () => {
  const { user } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );
  const account = profile ?? user;
  const isVerified = Boolean(account?.landlordVerified || account?.kyc?.status === 'approved');

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

        {loading ? (
          <LoadingState label="Checking verification status..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : isVerified ? (
          <PropertyForm onSubmit={handleSubmit} submitLabel="Publish Property" />
        ) : (
          <section className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 lg:p-12 text-center">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight">Verification Required</h3>
              <p className="text-sm text-secondary">
                You must complete and receive approval for your KYC verification before you can upload properties.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/dashboard/landlord/settings/verification')}
                >
                  Verify Now
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-surface-container-high px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
                  onClick={() => navigate('/dashboard/landlord/settings')}
                >
                  View Status
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </LandlordPortalLayout>
  );
};

export default AddProperty;
