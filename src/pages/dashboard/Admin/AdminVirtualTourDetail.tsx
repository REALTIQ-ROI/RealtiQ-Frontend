import { useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { propertyService } from '../../../services/propertyService';
import { virtualTourService } from '../../../services/virtualTourService';
import type { AdminVirtualTourDetail } from '../../../types/virtualTour';

type OwnerSummary = NonNullable<AdminVirtualTourDetail['owner']>;

const ownerWithName = (candidate: unknown): OwnerSummary | null => {
  if (!candidate || typeof candidate !== 'object') return null;

  const owner = candidate as OwnerSummary;
  return typeof owner.name === 'string' && owner.name.trim() ? owner : null;
};

const resolveTourOwner = (detail: AdminVirtualTourDetail): OwnerSummary | null =>
  ownerWithName(detail.owner)
  ?? ownerWithName(detail.property.owner)
  ?? ownerWithName(typeof detail.property.ownerId === 'object' ? detail.property.ownerId : null)
  ?? ownerWithName(detail.project?.owner);

const loadAdminVirtualTour = async (propertyId: string): Promise<AdminVirtualTourDetail> => {
  const detail = await virtualTourService.getAdminVirtualTour(propertyId);
  if (resolveTourOwner(detail)) return detail;

  // The virtual-tour projection can omit the owner for project-linked listings.
  // Reuse the existing protected admin property-review read to resolve the
  // property's actual owner by its canonical property ID.
  try {
    const { property } = await propertyService.getPropertyApprovalDetail(detail.property.id);
    const owner = ownerWithName(property.owner)
      ?? ownerWithName(typeof property.ownerId === 'object' ? property.ownerId : null);
    if (owner) return { ...detail, owner };
  } catch {
    // Keep safe provider details available if this optional owner projection is
    // unavailable; the page shows an explicit unavailable state instead.
  }

  return detail;
};

const AdminVirtualTourDetail = () => {
  const { propertyId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(
    () => loadAdminVirtualTour(propertyId),
    Boolean(propertyId),
  );
  const owner = data ? resolveTourOwner(data) ?? ownerWithName(data.owner) : null;

  return (
    <AdminLayout>
      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Safe provider data</p>
          <h1 className="text-3xl font-black">Virtual Tour Detail</h1>
        </header>
        {loading ? <LoadingState label="Loading safe detail..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {data ? (
          <>
            <section className="rounded-xl bg-white p-6">
              <h2 className="text-xl font-black">{data.property.title}</h2>
              <p className="text-sm text-secondary">
                {data.property.publicReference} · resolved {data.resolvedProvider ?? 'none'}
                {data.fallbackUsed ? ' via fallback' : ''}
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-secondary">Project</dt>
                  <dd>{data.project?.name ?? 'None'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-secondary">Owner</dt>
                  <dd>{owner?.name ?? 'Owner unavailable'}</dd>
                </div>
              </dl>
            </section>
            <section className="grid gap-5 md:grid-cols-2">
              {(['realsee', 'matterport'] as const).map((provider) => {
                const config = data.providers[provider];
                return (
                  <article key={provider} className="rounded-xl bg-white p-6">
                    <h2 className="font-black capitalize">{provider}</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="text-secondary">Status</dt><dd>{config.status}</dd></div>
                      <div><dt className="text-secondary">Enabled</dt><dd>{config.enabled ? 'Yes' : 'No'}</dd></div>
                      <div><dt className="text-secondary">Identifier</dt><dd>{provider === 'realsee' ? data.providers.realsee.workId : data.providers.matterport.modelSid}</dd></div>
                      <div><dt className="text-secondary">Failure</dt><dd>{config.failureReason ?? 'None'}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </section>
          </>
        ) : null}
      </main>
    </AdminLayout>
  );
};

export default AdminVirtualTourDetail;
