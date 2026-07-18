import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import { ownershipService } from '../../../services/ownershipService';
import { propertyService } from '../../../services/propertyService';
import { propertyRouteReference, type Property, type TitleDocumentRecord } from '../../../types';

interface PropertyDetailState {
  property: Property | null;
  titleDocuments: TitleDocumentRecord[];
}

const PropertyDetails = () => {
  const { id } = useParams();
  const [detail, setDetail] = useState<PropertyDetailState>({ property: null, titleDocuments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPropertyDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const targetId = id || propertyRouteReference((await ownershipService.getMyOwnedProperties())[0]);
        if (!targetId) {
          if (active) {
            setDetail({ property: null, titleDocuments: [] });
          }
          return;
        }

        const response = await propertyService.getPropertyOwnerDetail(targetId);
        if (active) {
          setDetail({
            property: response.property,
            titleDocuments: response.titleDocuments ?? [],
          });
        }
      } catch (err) {
        if (active) {
          setDetail({ property: null, titleDocuments: [] });
          setError(err instanceof Error ? err.message : 'Failed to load property details.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPropertyDetail();

    return () => {
      active = false;
    };
  }, [id]);

  const { property, titleDocuments } = detail;

  return (
    <BuyerPortalLayout
      pageEyebrow="Portfolio Overview"
      pageTitle="Property Details"
      pageSubtitle="Review the details of a property you already own."
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">Property Details</h1>
          <Link className="text-sm font-bold text-primary hover:underline" to="/dashboard/buyer/my-properties">
            Back to portfolio
          </Link>
        </div>
        {loading ? (
          <p className="text-secondary">Loading property details...</p>
        ) : error ? (
          <p className="text-secondary">{error}</p>
        ) : property ? (
          <article className="rounded-xl border border-outline-variant/20 p-5 space-y-2">
            <h2 className="text-2xl font-bold">{property.title}</h2>
            <p className="text-secondary">{property.location}</p>
            <p>{property.description}</p>
            <div className="text-sm text-on-surface-variant">
              {property.bedrooms} beds • {property.bathrooms} baths • {property.squareFeet.toLocaleString()} sqft
            </div>
            {property.amenities && property.amenities.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs font-medium text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-xs text-primary">check_circle</span>
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-outline-variant/20">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Title Documents</p>
              {titleDocuments.length > 0 ? (
                <div className="space-y-3">
                  {titleDocuments.map((document) => (
                    <div
                      key={document.publicReference ?? document._id ?? document.fileUrl}
                      className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{document.title ?? document.originalFileName ?? 'Title document'}</p>
                        <p className="text-xs text-secondary truncate">{document.documentType ?? document.mimeType ?? 'Document metadata'}</p>
                      </div>
                      {document.fileUrl ? (
                        <a
                          className="shrink-0 text-xs font-bold text-primary hover:underline"
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs font-bold text-secondary">Restricted</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary">No title documents are available for this property yet.</p>
              )}
            </div>
          </article>
        ) : (
          <p className="text-secondary">No purchased property selected.</p>
        )}
      </section>
    </BuyerPortalLayout>
  );
};

export default PropertyDetails;
