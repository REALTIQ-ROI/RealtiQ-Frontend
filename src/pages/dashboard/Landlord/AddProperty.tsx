import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyForm from '../../../components/property/PropertyForm';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { CreatePropertyPayload, CreatePropertyResponse } from '../../../services/propertyService';
import type { Property } from '../../../types';

const AddProperty = () => {
  const { user, activeProfile } = useAuth();
  const { addProperty } = useProperties();
  const navigate = useNavigate();
  const stepUp = useBoundStepUp<CreatePropertyResponse>();

  const finishCreation = (response: CreatePropertyResponse): Property => {
    toast.success(response.message || 'Property saved. Publication depends on the server readiness and approval workflow.');
    if (response.riskDetected) {
      toast.warning('Title document risk signals were detected. Legal review is required before title verification can be published.');
    }
    navigate('/dashboard/landlord/my-properties');
    return response.property;
  };

  const handleSubmit = async (payload: CreatePropertyPayload & { status?: string }) => {
    if (!user) {
      toast.error('You must be logged in to create a property.');
      return undefined;
    }

    try {
      const response = await addProperty(user._id, payload);
      return response.property ? finishCreation(response) : undefined;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'AUTH_STEP_UP_REQUIRED') {
        await stepUp.begin({
          method: 'POST',
          path: '/api/properties',
          body: payload,
          label: 'Create this property listing',
          execute: async (challengeId, exactBody) => {
            const created = await addProperty(user._id, exactBody as CreatePropertyPayload, challengeId);
            finishCreation(created);
            return created;
          },
        });
        return undefined;
      }
      throw raw;
    }
  };

  return (
    <>
    <LandlordPortalLayout active="add-property" title="New Property Listing">
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <nav className="flex mb-8 gap-2 text-sm font-medium text-secondary">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span>Properties</span>
          <span className="material-symbols-outlined text-xs self-center">chevron_right</span>
          <span className="text-primary">Add New</span>
        </nav>

        {activeProfile ? (
          <>
            <p className="mb-5 rounded-lg bg-surface-container-low p-4 text-sm text-secondary">The server checks the selected profile's current verification, permission and publication eligibility when you submit.</p>
            {stepUp.error && !stepUp.challenge ? <p role="alert" className="mb-4 rounded-lg bg-error-container p-4 text-sm text-on-error-container">{stepUp.error}</p> : null}
            <PropertyForm onSubmit={handleSubmit} submitLabel="Save Listing" isLoading={stepUp.busy || Boolean(stepUp.challenge)} />
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 lg:p-12 text-center">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight">Select a profile</h3>
              <p className="text-sm text-secondary">
                Select an authorized profile before creating a property.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/dashboard/landlord/settings')}
                >
                  View profiles
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </LandlordPortalLayout>
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={async (code) => (await stepUp.complete(code)).ok} />
    </>
  );
};

export default AddProperty;
