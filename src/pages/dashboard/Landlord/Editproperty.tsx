import { useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import LandlordPortalLayout from "../../../components/layout/LandlordPortalLayout";
import PropertyForm from "../../../components/property/PropertyForm";
import LoadingState from "../../../components/ui/LoadingState";
import ErrorState from "../../../components/ui/ErrorState";
import { useProperties } from "../../../contexts/PropertiesContext";
import { useAsync } from "../../../hooks/useAsync";
import { ApiRequestError } from "../../../lib/axios";
import { propertyService, type UpdatePropertyPayload } from "../../../services/propertyService";
import { propertyRouteReference } from "../../../types";

const Editproperty = () => {
  const { updateProperty } = useProperties();
  const [hasConflict, setHasConflict] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, execute } = useAsync(
    () => id ? propertyService.getPropertyOwnerDetail(id) : Promise.reject(new Error('Missing property reference.')),
    Boolean(id),
    id,
  );
  const property = data?.property;

  const handleSubmit = async (
    payload: UpdatePropertyPayload & { status?: string },
  ) => {
    if (!property) {
      toast.error("Property not found.");
      return undefined;
    }

    try {
      const updated = await updateProperty(
        propertyRouteReference(property),
        { ...payload, ...(typeof property.version === 'number' ? { expectedVersion: property.version } : {}) },
      );
      toast.success("Property updated successfully");
      navigate("/dashboard/landlord/my-properties");
      return updated;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        setHasConflict(true);
        toast.error('This listing changed while you were editing. Review the latest owner details before saving again.');
        return undefined;
      }
      throw raw;
    }
  };

  return (
    <LandlordPortalLayout active="my-properties" title="Edit Listing">
      <div className="p-8 lg:p-12 bg-surface min-h-screen">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 mb-4 text-secondary text-xs font-semibold tracking-widest uppercase">
              <span>Properties</span>
              <span className="material-symbols-outlined text-[14px]">
                chevron_right
              </span>
              <span className="text-primary">Edit Listing</span>
            </nav>
            <h1 className="text-4xl font-extrabold text-primary tracking-tighter mb-2">
              {property?.title ?? "Edit Property"}
            </h1>
            <p className="text-secondary">
              {property
                ? `Editing property: ${propertyRouteReference(property)}`
                : "Loading property data..."}
            </p>
          </div>
          <button
            className="px-6 py-3 bg-surface-container-low text-on-surface font-semibold rounded-md hover:bg-surface-container transition-colors"
            type="button"
            onClick={() => navigate("/dashboard/landlord/my-properties")}
          >
            Back
          </button>
        </header>

        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {hasConflict ? <div role="alert" className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The server has a newer version. Your draft remains on this page. <button type="button" className="font-bold underline" onClick={() => { setHasConflict(false); void execute(); }}>Reload latest and discard draft</button></div> : null}
        {property && !error ? (
          <PropertyForm
            key={`${property._id}:${property.version ?? 'unversioned'}`}
            initialData={property}
            mode="edit"
            submitLabel="Save Changes"
            onSubmit={handleSubmit}
          />
        ) : loading ? (
          <LoadingState label="Loading property..." />
        ) : !error ? <p role="alert" className="text-sm text-secondary">The owner listing could not be loaded.</p> : null}
      </div>
    </LandlordPortalLayout>
  );
};

export default Editproperty;
