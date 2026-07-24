import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import PaymentTypeBadges from '../../../components/property/PaymentTypeBadges';
import { ownershipService } from '../../../services/ownershipService';
import { propertyService } from '../../../services/propertyService';
import { titleDocumentService } from '../../../services/titleDocumentService';
import { propertyRouteReference, type Property, type TitleDocumentRecord } from '../../../types';
import { documentTypeLabel } from '../../../utils/titleVerification';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';

interface PropertyDetailState {
  property: Property | null;
  titleDocuments: TitleDocumentRecord[];
}

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PropertyDetailState>({ property: null, titleDocuments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

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

  const openOwnedTitleDocument = async (document: TitleDocumentRecord) => {
    if (!property || openingDocumentId) return;
    const documentId = document._id || document.publicReference;
    if (!documentId) {
      toast.error('This title document is missing its protected viewer reference.');
      return;
    }

    setOpeningDocumentId(documentId);
    try {
      const session = await titleDocumentService.openViewer(documentId);
      navigate('/protected-title-viewer', {
        state: {
          session,
          documentId,
          propertyId: propertyRouteReference(property),
          returnPath: `/dashboard/buyer/property-details/${propertyRouteReference(property)}`,
        },
      });
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to open this title document.');
    } finally {
      setOpeningDocumentId(null);
    }
  };

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
              <p className="mb-3 text-sm text-secondary">
                As the property owner, you can open every available title document without another payment. Documents still use a short-lived protected viewer to keep private vault storage secure.
              </p>
              {titleDocuments.length > 0 ? (
                <div className="space-y-3">
                  {titleDocuments.map((document) => {
                    const documentId = document._id || document.publicReference || '';
                    const registryReference = property.titleDocumentReferences?.find((reference) =>
                      reference.publicReference === document.publicReference ||
                      reference.documentType === document.documentType,
                    );
                    return (
                      <div
                        key={documentId}
                        className="flex flex-col items-start justify-between gap-4 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{document.title ?? document.originalFileName ?? 'Title document'}</p>
                          <p className="text-xs text-secondary truncate">
                            {documentTypeLabel(document.documentType)}{document.publicReference ? ` • ${document.publicReference}` : ''}
                          </p>
                          {registryReference?.verificationStatus === 'published' &&
                          registryReference.publicVerificationId ? (
                            <Link
                              className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                              to={`/title-verification/${registryReference.publicVerificationId}`}
                            >
                              Registry ID: {registryReference.publicVerificationId}
                            </Link>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={!documentId || openingDocumentId === documentId}
                          onClick={() => void openOwnedTitleDocument(document)}
                          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {openingDocumentId === documentId ? 'Opening…' : 'View title document'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-secondary">No title documents are available for this property yet.</p>
              )}
            </div>
            <PaymentTypeBadges paymentTypes={normalizePropertyPaymentTypes(property.paymentTypes, property.price)} />
          </article>
        ) : (
          <p className="text-secondary">No purchased property selected.</p>
        )}
      </section>
    </BuyerPortalLayout>
  );
};

export default PropertyDetails;
