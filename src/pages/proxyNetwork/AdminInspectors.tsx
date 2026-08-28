import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminKycMediaViewer from "../../components/proxyNetwork/AdminKycMediaViewer";
import AgentApprovalModal from "../../components/proxyNetwork/AgentApprovalModal";
import ActionTextModal from "../../components/proxyNetwork/ActionTextModal";
import SecureImageThumbnail from "../../components/proxyNetwork/SecureImageThumbnail";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { formatLabel } from "../../features/proxyNetwork/config";
import {
  getKycMediaKind,
  readableKycFileType,
} from "../../features/proxyNetwork/kycMedia";
import { useProxyResource } from "../../features/proxyNetwork/useProxyResource";
import { proxyNetworkService } from "../../services/proxyNetworkService";
import type {
  AdminInspectorFilters,
  ProfessionalType,
  VerificationStatus,
} from "../../types/proxyNetwork";

export const AdminInspectorList = () => {
  const [params, setParams] = useSearchParams();
  const filters: AdminInspectorFilters = {
    verificationStatus: (params.get("verificationStatus") || undefined) as
      | VerificationStatus
      | undefined,
    professionalType: (params.get("professionalType") || undefined) as
      | ProfessionalType
      | undefined,
    state: params.get("state") || undefined,
    city: params.get("city") || undefined,
    serviceArea: params.get("serviceArea") || undefined,
    specialty: params.get("specialty") || undefined,
    minimumRating: params.get("minimumRating")
      ? Number(params.get("minimumRating"))
      : undefined,
    availability: (params.get("availability") ||
      undefined) as AdminInspectorFilters["availability"],
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    page: Number(params.get("page") || 1),
    limit: Number(params.get("limit") || 25),
  };
  const resource = useProxyResource(
    (signal) => proxyNetworkService.listAdminInspectors(filters, signal),
    [params.toString()],
  );
  const facets = useProxyResource(
    (signal) => proxyNetworkService.listAdminInspectorFacetProfiles(signal),
    [],
  );
  const facetOptions = useMemo(() => {
    const profiles = facets.data ?? [];
    const states = [
      ...new Set(
        profiles
          .map((profile) => profile.location?.state?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();
    const inState = filters.state
      ? profiles.filter((profile) => profile.location?.state === filters.state)
      : profiles;
    const cities = [
      ...new Set(
        inState
          .map((profile) => profile.location?.city?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();
    const inCity = filters.city
      ? inState.filter((profile) => profile.location?.city === filters.city)
      : inState;
    const serviceAreas = [
      ...new Set(
        inCity
          .flatMap((profile) => profile.serviceAreas ?? [])
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].sort();
    const inServiceArea = filters.serviceArea
      ? inCity.filter((profile) =>
          profile.serviceAreas?.includes(filters.serviceArea!),
        )
      : inCity;
    const specialties = [
      ...new Set(
        inServiceArea
          .flatMap((profile) => profile.specialties ?? [])
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].sort();
    const professionalTypes = [
      ...new Set(profiles.map((profile) => profile.professionalType)),
    ].sort();
    return { states, cities, serviceAreas, specialties, professionalTypes };
  }, [facets.data, filters.city, filters.serviceArea, filters.state]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "state") {
      next.delete("city");
      next.delete("serviceArea");
      next.delete("specialty");
    } else if (key === "city") {
      next.delete("serviceArea");
      next.delete("specialty");
    } else if (key === "serviceArea") {
      next.delete("specialty");
    }
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  return (
    <AdminLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <h1 className="text-3xl font-black">
          Verified Property Agent Review Queue
        </h1>
        <p className="mt-2 text-secondary">
          KYC and public-profile governance for independent professionals.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["", "under_review", "approved", "rejected", "suspended"].map(
            (status) => (
              <button
                key={status}
                onClick={() => update("verificationStatus", status)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${(params.get("verificationStatus") || "") === status ? "bg-primary text-on-primary" : "bg-white"}`}
              >
                {status ? formatLabel(status) : "All"}
              </button>
            ),
          )}
        </div>
        <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold">
            State
            <select
              value={params.get("state") || ""}
              onChange={(e) => update("state", e.target.value)}
              disabled={facets.loading}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-60"
            >
              <option value="">
                {facets.loading ? "Loading states…" : "All states"}
              </option>
              {facetOptions.states.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            City
            <select
              value={params.get("city") || ""}
              onChange={(e) => update("city", e.target.value)}
              disabled={facets.loading || facetOptions.cities.length === 0}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-60"
            >
              <option value="">All cities</option>
              {facetOptions.cities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Service area
            <select
              value={params.get("serviceArea") || ""}
              onChange={(e) => update("serviceArea", e.target.value)}
              disabled={
                facets.loading || facetOptions.serviceAreas.length === 0
              }
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-60"
            >
              <option value="">All service areas</option>
              {facetOptions.serviceAreas.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Specialty
            <select
              value={params.get("specialty") || ""}
              onChange={(e) => update("specialty", e.target.value)}
              disabled={facets.loading || facetOptions.specialties.length === 0}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-60"
            >
              <option value="">All specialties</option>
              {facetOptions.specialties.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Professional type
            <select
              value={params.get("professionalType") || ""}
              onChange={(e) => update("professionalType", e.target.value)}
              disabled={facets.loading}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-60"
            >
              <option value="">All professional types</option>
              {facetOptions.professionalTypes.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Availability
            <select
              value={params.get("availability") || ""}
              onChange={(e) => update("availability", e.target.value)}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3"
            >
              <option value="">Any availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Minimum rating
            <select
              value={params.get("minimumRating") || ""}
              onChange={(e) => update("minimumRating", e.target.value)}
              className="mt-2 w-full rounded-lg bg-surface-container-low p-3"
            >
              <option value="">Any rating</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>
        {facets.error ? (
          <p role="status" className="mt-3 text-sm text-error">
            Filter options could not be refreshed.{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => void facets.reload()}
            >
              Retry
            </button>
          </p>
        ) : null}
        {resource.loading ? <LoadingState /> : null}
        {resource.error ? (
          <ErrorState
            message={resource.error.message}
            onRetry={() => void resource.reload()}
          />
        ) : null}
        <div className="mt-5 overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-widest text-secondary">
              <tr>
                <th className="p-4">Professional</th>
                <th className="p-4">Type</th>
                <th className="p-4">Location</th>
                <th className="p-4">KYC status</th>
                <th className="p-4">Public</th>
              </tr>
            </thead>
            <tbody>
              {resource.data?.inspectors.map((profile) => {
                const user =
                  typeof profile.user === "string" ? null : profile.user;
                return (
                  <tr key={profile._id} className="border-b">
                    <td className="p-4">
                      <Link
                        to={`/admin/proxy-inspectors/${profile._id}`}
                        className="font-bold underline"
                      >
                        {user?.name || "Inspector"}
                      </Link>
                      <p className="text-xs text-secondary">{user?.email}</p>
                    </td>
                    <td className="p-4">
                      {formatLabel(profile.professionalType)}
                    </td>
                    <td className="p-4">
                      {[profile.location?.city, profile.location?.state]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="p-4">
                      {formatLabel(profile.verificationStatus)}
                    </td>
                    <td className="p-4">
                      {profile.isSearchable ? "Searchable" : "Hidden"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {resource.data?.inspectors.length === 0 ? (
            <p className="p-10 text-center text-secondary">
              No inspectors match this queue.
            </p>
          ) : null}
        </div>
        {resource.data ? (
          <div className="mt-5 flex justify-between">
            <p>
              Page {resource.data.page} · {resource.data.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={resource.data.page <= 1}
                onClick={() => update("page", String(resource.data!.page - 1))}
                className="rounded-lg bg-white px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={
                  resource.data.page * resource.data.limit >=
                  resource.data.total
                }
                onClick={() => update("page", String(resource.data!.page + 1))}
                className="rounded-lg bg-white px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </AdminLayout>
  );
};

export const AdminInspectorDetailPage = () => {
  const { profileId = "" } = useParams();
  const resource = useProxyResource(
    (signal) => proxyNetworkService.getAdminInspector(profileId, signal),
    [profileId],
  );
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    url: string;
    mimeType?: string;
  } | null>(null);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [textAction, setTextAction] = useState<{
    title: string;
    description: string;
    label: string;
    confirmLabel: string;
    requiredMessage: string;
    tone?: "primary" | "danger";
    onSubmit: (value: string) => void;
  } | null>(null);
  const act = async (fn: () => Promise<unknown>, message: string) => {
    setPending(true);
    try {
      await fn();
      toast.success(message);
      await resource.reload();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : "Action failed.");
    } finally {
      setPending(false);
    }
  };
  if (resource.loading)
    return (
      <AdminLayout>
        <LoadingState />
      </AdminLayout>
    );
  if (resource.status === 404)
    return (
      <AdminLayout>
        <div className="p-12 text-center">
          <h1 className="text-3xl font-black">Inspector not found</h1>
        </div>
      </AdminLayout>
    );
  if (resource.error || !resource.data)
    return (
      <AdminLayout>
        <ErrorState
          message={resource.error?.message || "Unable to load profile."}
          onRetry={() => void resource.reload()}
        />
      </AdminLayout>
    );
  const { profile } = resource.data;
  const user = typeof profile.user === "string" ? null : profile.user;
  const kyc = user?.kyc;
  const profileImage =
    profile.profileImageUrl ||
    profile.profilePhoto?.accessUrl ||
    profile.profilePhoto?.url;
  const idDocumentUrl = kyc?.idDocumentAccessUrl || kyc?.idDocumentUrl;
  const selfieUrl = kyc?.selfieAccessUrl || kyc?.selfieUrl;
  const reject = () =>
    setTextAction({
      title: "Reject Property Agent",
      description:
        "Rejecting keeps this profile hidden from public discovery. The reason is required and should explain what the applicant must address.",
      label: "Rejection reason",
      confirmLabel: "Reject Property Agent",
      requiredMessage: "Rejection reason is required.",
      tone: "danger",
      onSubmit: (reason) => {
        setTextAction(null);
        void act(
          () =>
            proxyNetworkService.reviewInspector(profileId, {
              decision: "reject",
              reason,
            }),
          "Property Agent rejected.",
        );
      },
    });
  const approve = async (notes: string) => {
    setPending(true);
    try {
      await proxyNetworkService.reviewInspector(profileId, {
        decision: "approve",
        notes,
      });
      toast.success("Property Agent approved.");
      await resource.reload();
      setApprovalOpen(false);
      return null;
    } catch (raw) {
      const message =
        raw instanceof Error
          ? raw.message
          : "Unable to approve this Property Agent.";
      toast.error(message);
      return message;
    } finally {
      setPending(false);
    }
  };
  return (
    <AdminLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Link to="/admin/proxy-inspectors" className="font-bold">
          ← Review queue
        </Link>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {profileImage && !profileImageFailed ? (
                  <img
                    src={profileImage}
                    onError={() => setProfileImageFailed(true)}
                    alt={`${user?.name || "Property Agent"} profile`}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container-high text-3xl font-black"
                    aria-label="No profile image"
                  >
                    {user?.name?.[0] || "A"}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                    {formatLabel(profile.verificationStatus)}
                  </p>
                  <h1 className="mt-2 text-3xl font-black">
                    {user?.name || "RealtiQ Verified Property Agent"}
                  </h1>
                  <p className="mt-2 text-secondary">
                    {user?.email} · {user?.phone}
                  </p>
                  <p className="mt-3">
                    {formatLabel(profile.professionalType)} ·{" "}
                    {[profile.location?.city, profile.location?.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="mt-2 text-sm">
                    Public discovery:{" "}
                    {profile.isSearchable ? "Searchable" : "Hidden"}
                  </p>
                </div>
              </div>
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">
                  Identity and KYC — Admin only
                </h2>
                <button
                  type="button"
                  onClick={() => void resource.reload()}
                  className="rounded-lg bg-surface-container-low px-4 py-2 text-xs font-bold"
                >
                  Refresh secure URLs
                </button>
              </div>
              <p className="mt-2 text-xs text-secondary">
                Secure document URLs are fetched when this page opens and are
                kept only in this page’s memory.
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold text-secondary">
                    Legal name
                  </dt>
                  <dd>{kyc?.fullLegalName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-secondary">
                    KYC status
                  </dt>
                  <dd>{formatLabel(kyc?.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-secondary">Address</dt>
                  <dd>{kyc?.address || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-secondary">
                    National ID
                  </dt>
                  <dd>{kyc?.nationalId || "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {idDocumentUrl ? (
                  <article className="rounded-xl border border-outline-variant/20 p-3">
                    {getKycMediaKind(kyc?.idDocumentMimeType, idDocumentUrl) ===
                    "image" ? (
                      <SecureImageThumbnail
                        src={idDocumentUrl}
                        alt="Identity document"
                        onClick={() =>
                          setPreview({
                            title: "Identity document",
                            url: idDocumentUrl,
                            mimeType: kyc?.idDocumentMimeType,
                          })
                        }
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-xl bg-surface-container-low">
                        <span
                          className="material-symbols-outlined text-5xl text-secondary"
                          aria-hidden="true"
                        >
                          picture_as_pdf
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">Identity document</h3>
                        <p className="text-xs text-secondary">
                          {readableKycFileType(
                            kyc?.idDocumentMimeType,
                            idDocumentUrl,
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            title: "Identity document",
                            url: idDocumentUrl,
                            mimeType: kyc?.idDocumentMimeType,
                          })
                        }
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
                      >
                        View
                      </button>
                    </div>
                  </article>
                ) : (
                  <p className="rounded-xl bg-surface-container-low p-4 text-sm text-secondary">
                    No identity document was returned.
                  </p>
                )}
                {selfieUrl ? (
                  <article className="rounded-xl border border-outline-variant/20 p-3">
                    <SecureImageThumbnail
                      src={selfieUrl}
                      alt="KYC selfie"
                      onClick={() =>
                        setPreview({
                          title: "KYC selfie",
                          url: selfieUrl,
                          mimeType: kyc?.selfieMimeType || "image/jpeg",
                        })
                      }
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">KYC selfie</h3>
                        <p className="text-xs text-secondary">
                          Identity selfie
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            title: "KYC selfie",
                            url: selfieUrl,
                            mimeType: kyc?.selfieMimeType || "image/jpeg",
                          })
                        }
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
                      >
                        View
                      </button>
                    </div>
                  </article>
                ) : (
                  <p className="rounded-xl bg-surface-container-low p-4 text-sm text-secondary">
                    No KYC selfie was returned.
                  </p>
                )}
              </div>
              <h3 className="mt-6 font-bold">Professional credentials</h3>
              {kyc?.professionalDocuments?.length ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {kyc.professionalDocuments.map((document, index) => {
                    const documentUrl = document.accessUrl || document.url;
                    const label = document.label || "Professional credential";
                    return (
                      <li
                        key={document._id || `${label}-${index}`}
                        className="rounded-xl border border-outline-variant/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{label}</h4>
                            <p className="mt-1 text-xs text-secondary">
                              {readableKycFileType(
                                document.mimeType,
                                documentUrl,
                              )}{" "}
                              · {document.mimeType || "MIME type unavailable"}
                            </p>
                            <p className="mt-2 text-xs font-bold">
                              {formatLabel(
                                document.verificationStatus || "unverified",
                              )}
                            </p>
                          </div>
                          <span
                            className="material-symbols-outlined text-secondary"
                            aria-hidden="true"
                          >
                            {getKycMediaKind(document.mimeType, documentUrl) ===
                            "image"
                              ? "image"
                              : getKycMediaKind(
                                    document.mimeType,
                                    documentUrl,
                                  ) === "pdf"
                                ? "picture_as_pdf"
                                : "description"}
                          </span>
                        </div>
                        {documentUrl ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPreview({
                                  title: label,
                                  url: documentUrl,
                                  mimeType: document.mimeType,
                                })
                              }
                              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
                            >
                              View
                            </button>
                            <a
                              href={documentUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-secondary">
                            No secure URL is available for this credential.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl bg-surface-container-low p-4 text-sm text-secondary">
                  No professional credentials were submitted.
                </p>
              )}
              <p className="mt-3 text-xs text-secondary">
                An uploaded credential remains unverified unless its own RealTIQ
                status is “verified”.
              </p>
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">History and payout</h2>
              <p className="mt-3">
                {resource.data.jobCount} jobs · {resource.data.disputeCount}{" "}
                disputes · {resource.data.reviews.length} reviews
              </p>
              {resource.data.payoutAccount ? (
                <p className="mt-3">
                  {resource.data.payoutAccount.bankName} ·{" "}
                  {resource.data.payoutAccount.maskedAccountNumber} ·{" "}
                  {resource.data.payoutAccount.verifiedAccountName}
                </p>
              ) : (
                <p className="mt-3 text-amber-800">
                  No verified payout account.
                </p>
              )}
            </section>
          </div>
          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-black">Profile actions</h2>
            {profile.verificationStatus === "under_review" ? (
              <div className="mt-4 space-y-3">
                <button
                  disabled={pending}
                  onClick={() => setApprovalOpen(true)}
                  className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white"
                >
                  Approve
                </button>
                <button
                  disabled={pending}
                  onClick={reject}
                  className="w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white"
                >
                  Reject
                </button>
              </div>
            ) : null}
            {profile.verificationStatus === "approved" ? (
              <button
                disabled={pending}
                onClick={() =>
                  setTextAction({
                    title: "Suspend Property Agent",
                    description:
                      "Suspending hides this profile from public discovery but keeps historical jobs intact.",
                    label: "Suspension reason",
                    confirmLabel: "Suspend Property Agent",
                    requiredMessage: "Suspension reason is required.",
                    tone: "danger",
                    onSubmit: (reason) => {
                      setTextAction(null);
                      void act(
                        () =>
                          proxyNetworkService.suspendInspector(
                            profileId,
                            reason,
                          ),
                        "Inspector suspended and hidden.",
                      );
                    },
                  })
                }
                className="mt-4 w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white"
              >
                Suspend
              </button>
            ) : null}
            {profile.verificationStatus === "suspended" ? (
              <button
                disabled={pending}
                onClick={() =>
                  setTextAction({
                    title: "Reactivate Property Agent",
                    description:
                      "Reactivation returns this profile to an approved and searchable state after RealTIQ confirms the action.",
                    label: "Reactivation notes",
                    confirmLabel: "Reactivate Property Agent",
                    requiredMessage: "Reactivation notes are required.",
                    onSubmit: (notes) => {
                      setTextAction(null);
                      void act(
                        () =>
                          proxyNetworkService.reactivateInspector(
                            profileId,
                            notes,
                          ),
                        "Inspector reactivated.",
                      );
                    },
                  })
                }
                className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary"
              >
                Reactivate
              </button>
            ) : null}
            <p className="mt-4 text-xs text-secondary">
              Badges and public visibility update only after RealTIQ
              confirms the action.
            </p>
          </aside>
        </div>
        {preview ? (
          <AdminKycMediaViewer {...preview} onClose={() => setPreview(null)} />
        ) : null}
        {approvalOpen ? (
          <AgentApprovalModal
            agentName={user?.name || "this Property Agent"}
            pending={pending}
            onClose={() => setApprovalOpen(false)}
            onSubmit={approve}
          />
        ) : null}
        {textAction ? (
          <ActionTextModal
            {...textAction}
            pending={pending}
            onClose={() => setTextAction(null)}
          />
        ) : null}
      </main>
    </AdminLayout>
  );
};
