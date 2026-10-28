import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import StepUpDialog from "../../components/auth/StepUpDialog";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminKycMediaViewer from "../../components/proxyNetwork/AdminKycMediaViewer";
import AgentApprovalModal from "../../components/proxyNetwork/AgentApprovalModal";
import ActionTextModal from "../../components/proxyNetwork/ActionTextModal";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useBoundStepUp } from "../../hooks/useBoundStepUp";
import { adminInspectorProfileId, formatLabel } from "../../features/proxyNetwork/config";
import {
  getKycMediaKind,
  readableKycFileType,
} from "../../features/proxyNetwork/kycMedia";
import { useProxyResource } from "../../features/proxyNetwork/useProxyResource";
import { proxyNetworkService } from "../../services/proxyNetworkService";
import type {
  AdminKycContentAccess,
  AdminInspectorFilters,
  ProfessionalType,
  VerificationStatus,
} from "../../types/proxyNetwork";

const formatAdminDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

const formatAdminMoney = (amount?: number, currency?: string) => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

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
                const profileId = adminInspectorProfileId(profile);
                return (
                  <tr key={profileId ?? `missing-profile-id-${user?._id ?? user?.name ?? "unknown"}`} className="border-b">
                    <td className="p-4">
                      {profileId ? (
                        <Link to={`/admin/proxy-inspectors/${encodeURIComponent(profileId)}`} className="font-bold underline">
                          {user?.name || "Inspector"}
                        </Link>
                      ) : (
                        <span className="font-bold">{user?.name || "Inspector"}</span>
                      )}
                      {!profileId ? <p role="status" className="mt-1 text-xs text-error">Profile details are unavailable because this record has no profile ID.</p> : null}
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
  const validProfileId = Boolean(profileId && profileId !== "undefined" && profileId !== "null");
  const resource = useProxyResource(
    (signal) => validProfileId
      ? proxyNetworkService.getAdminInspector(profileId, signal)
      : Promise.reject(new Error("The selected Property Agent profile ID is missing. Return to the review queue and open the record again.")),
    [profileId],
  );
  const stepUp = useBoundStepUp<unknown>();
  const cancelStepUp = stepUp.cancel;
  const [pending, setPending] = useState(false);
  const [protectedActionLabel, setProtectedActionLabel] = useState("Property Agent decision");
  const [preview, setPreview] = useState<{
    profileId: string;
    requestVersion: number;
    title: string;
    url: string;
    mimeType?: string;
  } | null>(null);
  const [nationalIdRevealProfileId, setNationalIdRevealProfileId] = useState<string | null>(null);
  const [documentLoadingKey, setDocumentLoadingKey] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState("");
  const privateObjectUrlRef = useRef<string | null>(null);
  const privateContentControllerRef = useRef<AbortController | null>(null);
  const documentRequestVersionRef = useRef(0);
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
  useEffect(() => {
    cancelStepUp();
    return () => cancelStepUp();
  }, [profileId, cancelStepUp]);
  useEffect(() => () => {
    documentRequestVersionRef.current += 1;
    privateContentControllerRef.current?.abort();
    privateContentControllerRef.current = null;
    if (privateObjectUrlRef.current) URL.revokeObjectURL(privateObjectUrlRef.current);
    privateObjectUrlRef.current = null;
  }, [profileId]);
  useEffect(() => {
    setNationalIdRevealProfileId(null);
    setDocumentError("");
    setDocumentLoadingKey(null);
  }, [profileId]);

  const closePrivateDocument = () => {
    documentRequestVersionRef.current += 1;
    privateContentControllerRef.current?.abort();
    privateContentControllerRef.current = null;
    if (privateObjectUrlRef.current) URL.revokeObjectURL(privateObjectUrlRef.current);
    privateObjectUrlRef.current = null;
    setPreview(null);
  };

  const openPrivateDocument = async (
    key: string,
    title: string,
    access: AdminKycContentAccess | undefined,
    fallbackMimeType?: string,
  ) => {
    if (!access || access.status !== "protected_route" || access.method !== "GET") return;
    privateContentControllerRef.current?.abort();
    const controller = new AbortController();
    privateContentControllerRef.current = controller;
    const requestVersion = ++documentRequestVersionRef.current;
    const requestedProfileId = profileId;
    setDocumentError("");
    setDocumentLoadingKey(key);
    try {
      const result = await proxyNetworkService.fetchAdminInspectorDocument(access, controller.signal);
      if (controller.signal.aborted || requestVersion !== documentRequestVersionRef.current) return;
      const contentType = result.contentType || fallbackMimeType || "application/octet-stream";
      const objectUrl = URL.createObjectURL(new Blob([result.blob], { type: contentType }));
      if (privateObjectUrlRef.current) URL.revokeObjectURL(privateObjectUrlRef.current);
      privateObjectUrlRef.current = objectUrl;
      setPreview({ profileId: requestedProfileId, requestVersion, title, url: objectUrl, mimeType: contentType });
    } catch (error) {
      if (!controller.signal.aborted && requestVersion === documentRequestVersionRef.current) {
        setDocumentError(error instanceof Error ? error.message : "The protected document could not be loaded.");
      }
    } finally {
      if (requestVersion === documentRequestVersionRef.current) {
        privateContentControllerRef.current = null;
        setDocumentLoadingKey(null);
      }
    }
  };

  if (!validProfileId) {
    return (
      <AdminLayout>
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
          <ErrorState message="This Property Agent link does not contain a valid profile ID. Return to the review queue and reopen the record." />
          <Link to="/admin/proxy-inspectors" className="font-bold underline">Return to review queue</Link>
        </main>
      </AdminLayout>
    );
  }

  const beginReview = async (body: { decision: "approve"; notes: string } | { decision: "reject"; reason: string }) => {
    const path = `/api/admin/proxy-inspectors/${encodeURIComponent(profileId)}/review`;
    setProtectedActionLabel(body.decision === "approve" ? "Approve Property Agent" : "Reject Property Agent");
    const started = await stepUp.begin({
      method: "PATCH",
      path,
      body,
      label: `${body.decision === "approve" ? "Approve" : "Reject"} Property Agent profile`,
      execute: (challengeId, exactBody) => proxyNetworkService.reviewInspector(profileId, challengeId, exactBody),
    });
    if (!started) toast.error(stepUp.getError() ?? "Unable to start the protected review.");
    return started;
  };

  const beginTextMutation = async (kind: "suspend" | "reactivate", value: string) => {
    const suspend = kind === "suspend";
    const path = `/api/admin/proxy-inspectors/${encodeURIComponent(profileId)}/${kind}`;
    setProtectedActionLabel(suspend ? "Suspend Property Agent" : "Reactivate Property Agent");
    const started = suspend
      ? await stepUp.begin({
        method: "PATCH",
        path,
        body: { reason: value },
        label: "Suspend Property Agent profile",
        execute: (challengeId, exactBody) => proxyNetworkService.suspendInspector(profileId, challengeId, exactBody.reason),
      })
      : await stepUp.begin({
        method: "PATCH",
        path,
        body: { notes: value },
        label: "Reactivate Property Agent profile",
        execute: (challengeId, exactBody) => proxyNetworkService.reactivateInspector(profileId, challengeId, exactBody.notes),
      });
    if (!started) toast.error(stepUp.getError() ?? "Unable to start the protected profile action.");
    return started;
  };

  const completeProtectedAction = async (code: string): Promise<boolean> => {
    setPending(true);
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) {
        if (/conflict|changed|stale/i.test(result.error ?? "")) await resource.reload();
        return false;
      }
      toast.success(`${protectedActionLabel} was confirmed by the server. Profile state refreshed.`);
      await resource.reload();
      return true;
    } finally {
      setPending(false);
    }
  };
  const detailMatchesRoute = resource.data?.profile?._id === profileId;
  if (resource.loading || (resource.data && !detailMatchesRoute))
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
  if (resource.error || !resource.data || !detailMatchesRoute)
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
  const kyc = user?.kyc ?? profile.kyc;
  const profileImage =
    profile.profileImageUrl ||
    profile.profilePhoto?.accessUrl;
  const privateDocuments = [
    { key: "idDocument", label: "Identity document", document: kyc?.privateDocuments?.idDocument, mimeType: "application/octet-stream" },
    { key: "selfie", label: "KYC selfie", document: kyc?.privateDocuments?.selfie, mimeType: "image/jpeg" },
  ];
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
        void beginReview({ decision: "reject", reason }).then((started) => {
          if (started) setTextAction(null);
        });
      },
    });
  const approve = async (notes: string) => {
    const started = await beginReview({ decision: "approve", notes });
    if (!started) return stepUp.getError() ?? "Unable to start the protected approval.";
    setApprovalOpen(false);
    return null;
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
                    {profile.name || user?.name || "Property Agent"}
                  </h1>
                  <p className="mt-2 text-secondary">
                    Email: {user?.email || "—"} · Phone: {user?.phone || "—"}
                  </p>
                  <p className="mt-1 text-sm text-secondary">
                    Account: {formatLabel(user?.accountStatus)} · Role: {formatLabel(user?.role)} · Email {user?.emailVerified ? "verified" : "unverified"} · Phone {user?.phoneVerified ? "verified" : "unverified"}
                  </p>
                  <p className="mt-3">
                    {profile.professionalTitle || formatLabel(profile.professionalType)} · {formatLabel(profile.professionalType)} ·{" "}
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
              <h2 className="text-xl font-black">Professional profile and account</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-xs font-bold text-secondary">Profile ID</dt><dd className="break-all">{profile._id}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Profile ID alias</dt><dd className="break-all">{profile.id || "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Account ID</dt><dd className="break-all">{user?._id || "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Professional title</dt><dd>{profile.professionalTitle || "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Years of experience</dt><dd>{profile.yearsOfExperience ?? "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Availability</dt><dd>{formatLabel(profile.availabilityStatus)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Rating</dt><dd>{profile.ratingAverage ?? "—"} ({profile.ratingCount ?? 0} ratings)</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Completed jobs</dt><dd>{profile.completedJobs ?? "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Response rate</dt><dd>{profile.responseRate == null ? "—" : `${profile.responseRate}%`}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Location</dt><dd>{[profile.location?.city, profile.location?.state, profile.location?.country].filter(Boolean).join(", ") || "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Coordinates</dt><dd>{profile.location?.coordinates ? `${profile.location.coordinates.lat ?? "—"}, ${profile.location.coordinates.lng ?? "—"}` : "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Created</dt><dd>{formatAdminDate(profile.createdAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Updated</dt><dd>{formatAdminDate(profile.updatedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Submitted</dt><dd>{formatAdminDate(profile.submittedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Reviewed</dt><dd>{formatAdminDate(profile.reviewedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Approved</dt><dd>{formatAdminDate(profile.approvedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Suspended</dt><dd>{formatAdminDate(profile.suspendedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Account created</dt><dd>{formatAdminDate(user?.createdAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Account updated</dt><dd>{formatAdminDate(user?.updatedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Profile verification</dt><dd>{formatLabel(profile.verificationStatus)}</dd></div>
              </dl>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><h3 className="text-xs font-bold text-secondary">Specialties</h3><p className="mt-1">{profile.specialties?.length ? profile.specialties.join(", ") : "—"}</p></div>
                <div><h3 className="text-xs font-bold text-secondary">Service areas</h3><p className="mt-1">{profile.serviceAreas?.length ? profile.serviceAreas.join(", ") : "—"}</p></div>
              </div>
              <div className="mt-4"><h3 className="text-xs font-bold text-secondary">Professional bio</h3><p className="mt-1 whitespace-pre-wrap">{profile.bio || "—"}</p></div>
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
                  Refresh profile and KYC details
                </button>
              </div>
              <p className="mt-2 text-xs text-secondary">
                KYC details are shown only in this authorized staff view. Document bytes and provider URLs are not included in this response; protected files are fetched on demand through the authenticated viewer route.
              </p>
              {!kyc ? (
                <p role="status" className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm text-secondary">
                  The admin Property Agent detail response did not include KYC details for this profile.
                </p>
              ) : null}
              {documentError ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{documentError}</p> : null}
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold text-secondary">Legal name</dt>
                  <dd>{kyc?.fullLegalName || "—"}</dd>
                </div>
                <div><dt className="text-xs font-bold text-secondary">KYC status</dt><dd>{formatLabel(kyc?.status)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">KYC route</dt><dd>{formatLabel(kyc?.route)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Address</dt><dd>{kyc?.address || "—"}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">KYC phone</dt><dd>{kyc?.phone || "—"}</dd></div>
                <div>
                  <dt className="text-xs font-bold text-secondary">National ID</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span>{kyc?.nationalId ? (nationalIdRevealProfileId === profileId ? kyc.nationalId : `••••${kyc.nationalId.slice(-4)}`) : "—"}</span>
                    {kyc?.nationalId ? <button type="button" className="text-xs font-bold underline" onClick={() => setNationalIdRevealProfileId(nationalIdRevealProfileId === profileId ? null : profileId)}>{nationalIdRevealProfileId === profileId ? "Hide" : "Reveal"} ID</button> : null}
                  </dd>
                </div>
                <div><dt className="text-xs font-bold text-secondary">Submitted</dt><dd>{formatAdminDate(kyc?.submittedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Reviewed</dt><dd>{formatAdminDate(kyc?.reviewedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-secondary">Minimum verified</dt><dd>{formatAdminDate(kyc?.minimumVerifiedAt)}</dd></div>
              </dl>
              <h3 className="mt-6 font-bold">KYC evidence checks</h3>
              {kyc?.evidence?.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-2">{kyc.evidence.map((evidence, index) => <li key={`${evidence.kind}-${index}`} className="rounded-xl bg-surface-container-low p-4"><p className="font-bold">{formatLabel(evidence.kind)} · {formatLabel(evidence.status)}</p><dl className="mt-2 grid gap-1 text-xs"><div><dt className="inline font-bold">Checked: </dt><dd className="inline">{formatAdminDate(evidence.checkedAt)}</dd></div><div><dt className="inline font-bold">Expires: </dt><dd className="inline">{formatAdminDate(evidence.expiresAt)}</dd></div><div><dt className="inline font-bold">Policy version: </dt><dd className="inline">{evidence.policyVersion || "—"}</dd></div></dl></li>)}</ul> : <p className="mt-2 text-sm text-secondary">No KYC evidence checks were returned.</p>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {privateDocuments.map(({ key, label, document, mimeType }) => {
                  const access = document?.contentAccess;
                  return <article key={key} className="rounded-xl border border-outline-variant/20 p-4">
                    <h3 className="font-bold">{label}</h3>
                    <p className="mt-1 text-sm">{document?.submitted ? "Submitted" : "Not submitted"}</p>
                    {access?.status === "protected_route" ? <button type="button" disabled={documentLoadingKey === key} onClick={() => void openPrivateDocument(key, label, access, mimeType)} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-60">{documentLoadingKey === key ? "Loading protected file…" : "View protected file"}</button> : access?.status === "withheld" ? <p className="mt-2 text-xs text-secondary">File access is withheld ({access.reasonCode}).</p> : <p className="mt-2 text-xs text-secondary">No file-access status was returned.</p>}
                  </article>;
                })}
              </div>
              <h3 className="mt-6 font-bold">Professional credentials</h3>
              {kyc?.professionalDocuments?.length ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {kyc.professionalDocuments.map((document) => {
                    const label = document.label || `Professional credential ${document.index + 1}`;
                    const access = document.contentAccess;
                    return (
                      <li
                        key={document.index}
                        className="rounded-xl border border-outline-variant/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{label}</h4>
                            <p className="mt-1 text-xs text-secondary">
                              Document {document.index + 1} · {readableKycFileType(document.mimeType)} · {document.mimeType || "MIME type unavailable"}
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
                            {getKycMediaKind(document.mimeType) ===
                            "image"
                              ? "image"
                              : getKycMediaKind(document.mimeType) === "pdf"
                                ? "picture_as_pdf"
                                : "description"}
                          </span>
                        </div>
                        {access.status === "protected_route" ? <button type="button" disabled={documentLoadingKey === `professional-${document.index}`} onClick={() => void openPrivateDocument(`professional-${document.index}`, label, access, document.mimeType)} className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-60">{documentLoadingKey === `professional-${document.index}` ? "Loading protected file…" : "View protected file"}</button> : <p className="mt-3 text-xs text-secondary">File access is withheld ({access.reasonCode}).</p>}
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
                {kyc?.documentAccessNotice || "Document access is re-authorized by the protected endpoint. Upload or verification status alone does not grant access to file bytes."}
              </p>
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Activity, payout and reviews</h2>
              <p className="mt-3">
                {resource.data.jobCount} jobs · {resource.data.disputeCount}{" "}
                disputes · {resource.data.reviews.length} reviews
              </p>
              {resource.data.payoutAccount ? (
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-xs font-bold text-secondary">Bank</dt><dd>{resource.data.payoutAccount.bankName}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Masked account number</dt><dd>{resource.data.payoutAccount.maskedAccountNumber}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Verified account name</dt><dd>{resource.data.payoutAccount.verifiedAccountName}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Verified</dt><dd>{formatAdminDate(resource.data.payoutAccount.verifiedAt)}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Payout account ID</dt><dd className="break-all">{resource.data.payoutAccount._id || "—"}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Payout account user ID</dt><dd className="break-all">{resource.data.payoutAccount.user || "—"}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Payout account profile ID</dt><dd className="break-all">{resource.data.payoutAccount.profile || "—"}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Payout account created</dt><dd>{formatAdminDate(resource.data.payoutAccount.createdAt)}</dd></div>
                  <div><dt className="text-xs font-bold text-secondary">Payout account updated</dt><dd>{formatAdminDate(resource.data.payoutAccount.updatedAt)}</dd></div>
                </dl>
              ) : (
                <p className="mt-3 text-amber-800">
                  No verified payout account.
                </p>
              )}
              {resource.data.payoutSummary ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl bg-surface-container-low p-4">
                    <h3 className="text-xs font-bold uppercase text-secondary">Released ({resource.data.payoutSummary.currency})</h3>
                    <p className="mt-1 text-lg font-black">{formatAdminMoney(resource.data.payoutSummary.released.amount, resource.data.payoutSummary.currency)}</p>
                    <p className="text-sm text-secondary">{resource.data.payoutSummary.released.count} payouts</p>
                  </article>
                  <article className="rounded-xl bg-surface-container-low p-4">
                    <h3 className="text-xs font-bold uppercase text-secondary">Pending ({resource.data.payoutSummary.currency})</h3>
                    <p className="mt-1 text-lg font-black">{formatAdminMoney(resource.data.payoutSummary.pending.amount, resource.data.payoutSummary.currency)}</p>
                    <p className="text-sm text-secondary">{resource.data.payoutSummary.pending.count} payouts</p>
                  </article>
                </div>
              ) : <p className="mt-4 text-sm text-secondary">Payout summary was not provided.</p>}
              {resource.data.reviews.length ? (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {resource.data.reviews.map((review) => <li key={review.id} className="rounded-lg border border-outline-variant/20 p-3"><span className="font-bold">Rating: {review.rating}</span><span className="ml-2 break-all text-xs text-secondary">Review {review.id}</span></li>)}
                </ul>
              ) : <p className="mt-4 text-sm text-secondary">No review entries were returned.</p>}
            </section>
          </div>
          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-black">Profile actions</h2>
            <p className="mt-2 text-xs text-secondary">Staff decisions use a one-use authenticator challenge bound to the exact action and profile. The profile changes only after the server confirms the mutation.</p>
            {profile.verificationStatus === "under_review" ? (
              <div className="mt-4 space-y-3">
                <button
                  disabled={pending || stepUp.busy || Boolean(stepUp.challenge)}
                  onClick={() => setApprovalOpen(true)}
                  className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white"
                >
                  Approve
                </button>
                <button
                  disabled={pending || stepUp.busy || Boolean(stepUp.challenge)}
                  onClick={reject}
                  className="w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white"
                >
                  Reject
                </button>
              </div>
            ) : null}
            {profile.verificationStatus === "approved" ? (
              <button
                disabled={pending || stepUp.busy || Boolean(stepUp.challenge)}
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
                      void beginTextMutation("suspend", reason).then((started) => {
                        if (started) setTextAction(null);
                      });
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
                disabled={pending || stepUp.busy || Boolean(stepUp.challenge)}
                onClick={() =>
                  setTextAction({
                    title: "Reactivate Property Agent",
                    description:
                      "Reactivation returns this profile to an approved and searchable state after RealtIQ confirms the action.",
                    label: "Reactivation notes",
                    confirmLabel: "Reactivate Property Agent",
                    requiredMessage: "Reactivation notes are required.",
                    onSubmit: (notes) => {
                      void beginTextMutation("reactivate", notes).then((started) => {
                        if (started) setTextAction(null);
                      });
                    },
                  })
                }
                className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary"
              >
                Reactivate
              </button>
            ) : null}
            <p className="mt-4 text-xs text-secondary">
              Badges and public visibility update only after RealtIQ
              confirms the action.
            </p>
          </aside>
        </div>
        {preview?.profileId === profileId && preview.requestVersion === documentRequestVersionRef.current ? (
          <AdminKycMediaViewer {...preview} onClose={closePrivateDocument} />
        ) : null}
        {approvalOpen ? (
          <AgentApprovalModal
            agentName={user?.name || "this Property Agent"}
            pending={pending || stepUp.busy || Boolean(stepUp.challenge)}
            onClose={() => setApprovalOpen(false)}
            onSubmit={approve}
          />
        ) : null}
        {textAction ? (
          <ActionTextModal
            {...textAction}
            pending={pending || stepUp.busy || Boolean(stepUp.challenge)}
            onClose={() => setTextAction(null)}
          />
        ) : null}
        <StepUpDialog
          challenge={stepUp.challenge}
          busy={pending || stepUp.busy}
          error={stepUp.error}
          onCancel={stepUp.cancel}
          onSubmit={completeProtectedAction}
        />
      </main>
    </AdminLayout>
  );
};
