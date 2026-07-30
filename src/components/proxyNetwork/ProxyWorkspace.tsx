import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { ApiRequestError } from "../../lib/axios";
import ActionConfirmModal from "./ActionConfirmModal";
import type {
  DisputeResolution,
  PaymentInitializationResponse,
  ProxyEvidence,
  ProxyInspectionDetail,
  ProxyInspectionReport,
  ReportCondition,
  ReportRecommendation,
  ReportSection,
} from "../../types/proxyNetwork";
import {
  DECLARATION_TEXT,
  formatLabel,
  formatNgn,
} from "../../features/proxyNetwork/config";
import {
  detailPricing,
  estimateProxyPricing,
  normalizeProxyPricing,
  type NormalizedProxyPricing,
} from "../../features/proxyNetwork/pricing";
import { invalidateProxyData } from "../../features/proxyNetwork/cache";
import { selectProxyActions } from "../../features/proxyNetwork/selectors";
import {
  proxyNetworkService,
  type ReportInput,
} from "../../services/proxyNetworkService";

const field =
  "mt-2 w-full rounded-lg bg-surface-container-low px-3 py-3 text-sm";
const card = "rounded-2xl bg-white p-5 shadow-sm";
const action =
  "rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:opacity-50";

type PendingAction =
  | "sendMessage"
  | "uploadEvidence"
  | "saveDraft"
  | "resolveDispute"
  | "submitCompletion"
  | "confirmCompletion"
  | "raiseDispute"
  | "submitReview"
  | "proposePrice"
  | "confirmPrice"
  | "initializePayment"
  | "refreshStatus"
  | "schedule"
  | "start"
  | "releasePayment";

interface ConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
}

const percentLabel = (value?: number) =>
  value == null ? "percentage unavailable" : `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(value)}%`;

const percentNoticeLabel = (value?: number) =>
  value == null ? "default 10%" : percentLabel(value);

const FeeInfo = ({ label }: { label: string }) => (
  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-black text-secondary" title={label} aria-label={label}>
    i
  </span>
);

const FieldBadge = ({ required = false }: { required?: boolean }) => (
  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${required ? "bg-red-50 text-red-700" : "bg-surface-container-high text-secondary"}`}>
    {required ? "Required" : "Optional"}
  </span>
);

const BuyerPricingBreakdown = ({ pricing, estimated = false }: { pricing: NormalizedProxyPricing; estimated?: boolean }) => (
  <div className="mt-4 rounded-xl bg-surface-container-low p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-black">{estimated ? "Estimated buyer pricing" : "Buyer payment breakdown"}</h3>
      {estimated ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Estimated</span> : null}
    </div>
    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
      <div>
        <dt className="text-xs font-bold text-secondary">Agreed inspection fee</dt>
        <dd className="font-black">{formatNgn(pricing.agreedPrice)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-secondary">Platform & Protection Fee ({percentLabel(pricing.buyerFeePercentage)})<FeeInfo label="Supports secure payment processing, coordination, dispute assistance, refund handling, and platform protection." /></dt>
        <dd className="font-black">{formatNgn(pricing.buyerFeeAmount)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-secondary">Total amount to pay</dt>
        <dd className="font-black">{formatNgn(pricing.buyerTotalAmount)}</dd>
      </div>
    </dl>
    <p className="mt-3 text-xs text-secondary">
      RealtiQ adds a {percentLabel(pricing.buyerFeePercentage)} Platform & Protection Fee to your agreed inspection price. This supports secure payment processing, service coordination, dispute assistance and refund protection. Your payment is held securely, and the inspector is only paid after the service is completed and approved.
    </p>
  </div>
);

const InspectorPricingBreakdown = ({ pricing, estimated = false }: { pricing: NormalizedProxyPricing; estimated?: boolean }) => (
  <div className="mt-4 rounded-xl bg-surface-container-low p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-black">{estimated ? "Estimated inspector payout" : "Inspector payout breakdown"}</h3>
      {estimated ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Estimated</span> : null}
    </div>
    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
      <div>
        <dt className="text-xs font-bold text-secondary">Agreed inspection fee</dt>
        <dd className="font-black">{formatNgn(pricing.agreedPrice)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-secondary">RealtiQ commission ({percentLabel(pricing.inspectorCommissionPercentage)})<FeeInfo label="Supports client acquisition, payment collection, task coordination, dispute support, and secure payout processing." /></dt>
        <dd className="font-black">{formatNgn(pricing.inspectorCommissionAmount)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-secondary">Expected inspector payout</dt>
        <dd className="font-black">{formatNgn(pricing.inspectorPayoutAmount)}</dd>
      </div>
    </dl>
    <p className="mt-3 text-xs text-secondary">
      RealtiQ deducts a {percentLabel(pricing.inspectorCommissionPercentage)} commission from the agreed inspection fee. The commission supports client acquisition, secure payment collection, task coordination, dispute support and reliable payout processing. Payment processing charges are covered by RealtiQ and will not be deducted separately from your payout.
    </p>
  </div>
);

const AdminPricingBreakdown = ({ pricing }: { pricing: NormalizedProxyPricing }) => (
  <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div><dt className="text-xs text-secondary">Agreed price</dt><dd className="font-bold">{formatNgn(pricing.agreedPrice)}</dd></div>
    <div><dt className="text-xs text-secondary">Buyer fee ({percentLabel(pricing.buyerFeePercentage)})</dt><dd className="font-bold">{formatNgn(pricing.buyerFeeAmount)}</dd></div>
    <div><dt className="text-xs text-secondary">Buyer total paid</dt><dd className="font-bold">{formatNgn(pricing.buyerTotalAmount)}</dd></div>
    <div><dt className="text-xs text-secondary">Inspector commission ({percentLabel(pricing.inspectorCommissionPercentage)})</dt><dd className="font-bold">{formatNgn(pricing.inspectorCommissionAmount)}</dd></div>
    <div><dt className="text-xs text-secondary">Inspector payout</dt><dd className="font-bold">{formatNgn(pricing.inspectorPayoutAmount)}</dd></div>
    <div><dt className="text-xs text-secondary">Total RealtiQ revenue</dt><dd className="font-bold">{formatNgn(pricing.totalPlatformRevenue)}</dd></div>
  </dl>
);

export const Lifecycle = ({ detail }: { detail: ProxyInspectionDetail }) => {
  const stages = [
    "requested",
    "awaiting_price_confirmation",
    "awaiting_payment",
    "funded",
    "scheduled",
    "in_progress",
    "awaiting_buyer_confirmation",
    "release_pending",
    "completed",
  ];
  const current = stages.indexOf(detail.request.status);
  return (
    <section className={card}>
      <h2 className="font-black">Inspection lifecycle</h2>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((stage, index) => (
          <li
            key={stage}
            aria-current={stage === detail.request.status ? "step" : undefined}
            className={`rounded-lg border p-3 text-xs font-bold ${index <= current ? "border-primary bg-surface-container-low" : "border-outline-variant/20 text-secondary"}`}
          >
            <span className="mr-2">{index < current ? "✓" : index + 1}.</span>
            {formatLabel(stage)}
          </li>
        ))}
      </ol>
      {!stages.includes(detail.request.status) ? (
        <p className="mt-3 font-bold">{formatLabel(detail.request.status)}</p>
      ) : null}
      <p className="mt-3 text-xs text-secondary">
        Service escrow:{" "}
        {formatLabel(detail.serviceEscrow?.status || "not created")}
      </p>
    </section>
  );
};

const ConversationPanel = ({
  id,
  detail,
  mutate,
  busy = false,
}: {
  id: string;
  detail: ProxyInspectionDetail;
  mutate: (actionName: PendingAction, fn: () => Promise<unknown>, success: string) => Promise<void>;
  busy?: boolean;
}) => {
  const [text, setText] = useState("");
  const messages = detail.conversation?.messages || [];
  return (
    <section className={card}>
      <h2 className="text-xl font-black">Private job conversation</h2>
      <div
        className="mt-4 max-h-80 space-y-3 overflow-y-auto"
        aria-live="polite"
      >
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message._id}
              className={`rounded-lg p-3 text-sm ${message.kind === "system" ? "bg-blue-50" : message.kind === "administrative" ? "border border-amber-300 bg-amber-50" : "bg-surface-container-low"}`}
            >
              <p className="text-xs font-bold">
                {message.kind === "administrative"
                  ? "RealtiQ Admin"
                  : message.kind === "system"
                    ? "System update"
                    : typeof message.sender === "string" || !message.sender
                      ? "Participant"
                      : message.sender.name}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">
                {message.text}
              </p>
              <time className="mt-1 block text-[11px] text-secondary">
                {new Date(message.createdAt).toLocaleString()}
              </time>
            </div>
          ))
        ) : (
          <p className="text-sm text-secondary">No messages yet.</p>
        )}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          void mutate(
            "sendMessage",
            () => proxyNetworkService.sendMessage(id, text.trim()),
            "Message sent.",
          ).then(() => setText(""));
        }}
      >
        <label className="sr-only" htmlFor="proxy-message">
          Message
        </label>
        <textarea
          id="proxy-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${field} min-h-12 flex-1`}
          placeholder="Write a plain-text message"
        />
        <button disabled={!text.trim() || busy} className={action}>
          {busy ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
};

const DocumentPreview = ({
  item,
  onRefresh,
}: {
  item: ProxyEvidence;
  onRefresh: () => Promise<void>;
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mimeType = item.mimeType || "";
  const canPreview =
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json";

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    const load = async () => {
      setError("");
      setPreviewUrl("");
      if (!canPreview) return;
      setLoading(true);
      try {
        const response = await fetch(item.accessUrl);
        if (!response.ok) throw new Error("Preview could not be loaded.");
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType || blob.type }));
        if (!cancelled) setPreviewUrl(objectUrl);
      } catch (raw) {
        if (!cancelled) setError(raw instanceof Error ? raw.message : "Preview could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canPreview, item.accessUrl, mimeType]);

  return (
    <div className="overflow-hidden rounded-lg bg-surface-container-low">
      {loading ? (
        <div className="flex h-80 items-center justify-center bg-white text-sm font-bold text-secondary">
          Loading document preview...
        </div>
      ) : previewUrl ? (
        <iframe
          src={previewUrl}
          title={item.caption || formatLabel(item.category)}
          className="h-80 w-full border-0 bg-white"
        />
      ) : (
        <div className="flex h-80 flex-col items-center justify-center bg-white p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-secondary/50">description</span>
          <p className="mt-3 text-sm font-bold text-on-surface">Preview unavailable</p>
          <p className="mt-2 max-w-sm text-xs text-secondary">
            {error || "This document type cannot be previewed directly in the browser. Upload a PDF version for inline preview."}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 p-3 text-xs text-secondary">
        <span>{mimeType || formatLabel(item.category)}</span>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded-md bg-white px-3 py-1.5 font-bold text-primary"
        >
          Refresh preview
        </button>
      </div>
    </div>
  );
};

const EvidenceGallery = ({
  id,
  evidence,
  canUpload,
  mutate,
  busy = false,
}: {
  id: string;
  evidence: ProxyEvidence[];
  canUpload: boolean;
  mutate: (actionName: PendingAction, fn: () => Promise<unknown>, success: string) => Promise<void>;
  busy?: boolean;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [refreshed, setRefreshed] = useState<string[]>([]);
  const [error, setError] = useState("");
  const choose = (selected: File[]) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const invalid = selected.find(
      (file) => !allowed.includes(file.type) || file.size > 250 * 1024 * 1024,
    );
    if (invalid)
      return setError(`${invalid.name} is unsupported or exceeds 250 MB.`);
    if (selected.length + evidence.length > 12)
      return setError("A request supports no more than 12 evidence files.");
    setError("");
    setFiles(selected);
    setCaptions(selected.map(() => ""));
  };
  const refreshUrl = async (item: ProxyEvidence) => {
    if (refreshed.includes(item._id)) return;
    setRefreshed((old) => [...old, item._id]);
    await mutate(
      "refreshStatus",
      () => proxyNetworkService.getEvidence(id),
      "Evidence access refreshed.",
    );
  };
  return (
    <section className={card}>
      <h2 className="text-xl font-black">Protected evidence</h2>
      <p className="mt-1 text-xs text-secondary">
        Signed media links are short-lived and remain part of this private job;
        they are never added to property listing media.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {evidence.map((item) => (
          <figure
            key={item._id}
            className="overflow-hidden rounded-xl border border-outline-variant/20 p-3"
          >
            {item.type === "video" ? (
              <video
                controls
                preload="metadata"
                src={item.accessUrl}
                onError={() => void refreshUrl(item)}
                className="aspect-video w-full rounded-lg bg-black"
              />
            ) : item.type === "image" ? (
              <img
                src={item.accessUrl}
                onError={() => void refreshUrl(item)}
                alt={item.caption || formatLabel(item.category)}
                className="aspect-video w-full rounded-lg object-cover"
              />
            ) : (
              <DocumentPreview item={item} onRefresh={() => refreshUrl(item)} />
            )}
            <figcaption className="mt-2 text-sm">
              {item.caption || formatLabel(item.category)}
              {item.fileSize
                ? ` · ${(item.fileSize / 1024 / 1024).toFixed(1)} MB`
                : ""}
            </figcaption>
          </figure>
        ))}
      </div>
      {!evidence.length ? (
        <p className="mt-4 text-sm text-secondary">
          No protected evidence has been uploaded.
        </p>
      ) : null}
      {canUpload ? (
        <form
          className="mt-5 rounded-xl bg-surface-container-low p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!files.length || busy) return;
            void mutate(
              "uploadEvidence",
              () => proxyNetworkService.uploadEvidence(id, files, captions),
              "Evidence uploaded.",
            ).then(() => {
              setFiles([]);
              setCaptions([]);
            });
          }}
        >
          <label className="block text-sm font-bold">
            Choose evidence files (max 12, 250 MB each)
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.pdf,.doc,.docx"
              onChange={(e) => choose(Array.from(e.target.files || []))}
              className="mt-2 block w-full rounded-lg bg-white p-3"
            />
          </label>
          {files.map((file, index) => (
            <label
              key={`${file.name}-${index}`}
              className="mt-3 block text-xs font-bold"
            >
              {file.name}
              <input
                value={captions[index] || ""}
                onChange={(e) =>
                  setCaptions((old) =>
                    old.map((v, i) => (i === index ? e.target.value : v)),
                  )
                }
                placeholder="Caption"
                className={field}
              />
            </label>
          ))}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <button disabled={!files.length || busy} className={`${action} mt-4`}>
            {busy ? "Uploading evidence..." : "Upload selected evidence"}
          </button>
        </form>
      ) : null}
    </section>
  );
};

const seeded: ReportSection[] = [
  "Building Exterior",
  "Roof",
  "Walls",
  "Floors",
  "Doors and Windows",
  "Electrical",
  "Plumbing",
  "Water Supply",
  "Drainage",
  "Interior Condition",
  "Structural Observations",
  "Road Access",
  "Security",
  "Neighbourhood",
  "Visible Property Boundaries",
  "Utilities",
  "General Condition",
].map((title) => ({
  key: title.toLowerCase().replaceAll(" ", "_"),
  title,
  condition: "not_inspected",
}));

const reportDraftKey = (id: string) => `realtiq.proxyReportDraft.${id}`;

const normalizeReportDraft = (draft: ReportInput): ReportInput => ({
  ...draft,
  visibleDefects: draft.visibleDefects?.map((item) => item.trim()).filter(Boolean),
  positiveObservations: draft.positiveObservations?.map((item) => item.trim()).filter(Boolean),
});

const readLocalReportDraft = (id: string): ReportInput | null => {
  try {
    const raw = localStorage.getItem(reportDraftKey(id));
    return raw ? (JSON.parse(raw) as ReportInput) : null;
  } catch {
    return null;
  }
};

const writeLocalReportDraft = (id: string, draft: ReportInput) => {
  localStorage.setItem(reportDraftKey(id), JSON.stringify(draft));
};

const clearLocalReportDraft = (id: string) => {
  localStorage.removeItem(reportDraftKey(id));
};

const hasText = (value?: string) => Boolean(value?.trim());

const reportForCompletion = (detail: ProxyInspectionDetail, id: string, draftVersion = 0) => {
  void draftVersion;
  const localDraft = readLocalReportDraft(id);
  return localDraft ? normalizeReportDraft(localDraft) : detail.report;
};

const completionMissingItems = (
  detail: ProxyInspectionDetail,
  id: string,
  draftVersion = 0,
) => {
  const missing: string[] = [];
  const report = reportForCompletion(detail, id, draftVersion);
  const services = detail.request.requestedServices;
  const hasEvidence = (category: ProxyEvidence["category"]) =>
    detail.evidence.some((item) => item.category === category);

  if (!report) {
    missing.push("saved structured report");
  }
  if (!report?.declarationAccepted) {
    missing.push("accepted report declaration");
  }
  if (!hasText(report?.signedByName)) {
    missing.push("inspector signature name");
  }
  if (services.includes("condition_report")) {
    if (!report?.sections?.length) {
      missing.push("completed report sections");
    }
    if (!hasText(report?.summary)) {
      missing.push("completed report summary");
    }
  }
  if (services.includes("photos") && !hasEvidence("inspection_photo")) {
    missing.push("inspection photo evidence");
  }
  if (
    services.includes("recorded_video_walkthrough") &&
    !hasEvidence("walkthrough_video")
  ) {
    missing.push("walkthrough video evidence");
  }
  if (services.includes("neighbourhood_review") && !hasText(report?.neighbourhoodComments)) {
    missing.push("neighbourhood review comments");
  }
  if (services.includes("location_confirmation") && report?.locationConfirmed !== true) {
    missing.push("location confirmation");
  }
  if (services.includes("custom") && !hasText(report?.summary)) {
    missing.push("summary for custom requirements");
  }
  return missing;
};

const ReportPanel = ({
  id,
  report,
  editable,
  requestedServices,
  onLocalDraftSaved,
}: {
  id: string;
  report: ProxyInspectionReport | null;
  editable: boolean;
  requestedServices: ProxyInspectionDetail["request"]["requestedServices"];
  busy?: boolean;
  onLocalDraftSaved?: () => void;
}) => {
  const summaryRequired = requestedServices.includes("condition_report") || requestedServices.includes("custom");
  const neighbourhoodRequired = requestedServices.includes("neighbourhood_review");
  const locationRequired = requestedServices.includes("location_confirmation");
  const [draft, setDraft] = useState<ReportInput>(
    () =>
      readLocalReportDraft(id) || report || {
        sections: seeded,
        visibleDefects: [],
        positiveObservations: [],
        declarationAccepted: false,
      },
  );
  const [draftMessage, setDraftMessage] = useState("");
  const updateSection = (index: number, patch: Partial<ReportSection>) =>
    setDraft((old) => ({
      ...old,
      sections: (old.sections || seeded).map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  const setLines = (
    key: "visibleDefects" | "positiveObservations",
    value: string,
  ) =>
    setDraft((old) => ({
      ...old,
      [key]: value.split("\n"),
    }));
  if (!editable)
    return (
      <section className={card}>
        <h2 className="text-xl font-black">Structured condition report</h2>
        {!report ? (
          <p className="mt-3 text-secondary">
            The Inspector has not created a report yet.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-secondary">
              Observational report; it does not replace a formal structural
              engineering assessment.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {report.sections.map((section) => (
                <article
                  key={section.key}
                  className="rounded-lg bg-surface-container-low p-3"
                >
                  <h3 className="font-bold">{section.title}</h3>
                  <p className="text-sm">{formatLabel(section.condition)}</p>
                  {section.comments ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">
                      {section.comments}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-bold">Summary</dt>
                <dd className="whitespace-pre-wrap">{report.summary || "—"}</dd>
              </div>
              <div>
                <dt className="font-bold">Recommendation</dt>
                <dd>{formatLabel(report.recommendation)}</dd>
              </div>
              <div>
                <dt className="font-bold">Visible defects</dt>
                <dd>{report.visibleDefects?.join("; ") || "None recorded"}</dd>
              </div>
              <div>
                <dt className="font-bold">Positive observations</dt>
                <dd>
                  {report.positiveObservations?.join("; ") || "None recorded"}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Location confirmed</dt>
                <dd>{report.locationConfirmed ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="font-bold">Declaration</dt>
                <dd>
                  {report.declarationText || DECLARATION_TEXT}{" "}
                  {report.signedByName ? `— ${report.signedByName}` : ""}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>
    );
  return (
    <section className={card}>
      <h2 className="text-xl font-black">Condition report editor</h2>
      <p className="mt-2 text-sm text-secondary">
        Save a draft explicitly. This observational report does not replace a
        formal structural engineering assessment.
      </p>
      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          writeLocalReportDraft(id, draft);
          onLocalDraftSaved?.();
          setDraftMessage("Draft saved on this device. It will be submitted only when you submit completion.");
        }}
      >
        <label className="block text-sm font-bold">
          Inspection date <FieldBadge />
          <input
            type="datetime-local"
            value={draft.inspectionDate?.slice(0, 16) || ""}
            onChange={(e) =>
              setDraft((old) => ({
                ...old,
                inspectionDate: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              }))
            }
            className={field}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          {(draft.sections || seeded).map((section, index) => (
            <fieldset
              key={section.key}
              className="rounded-xl bg-surface-container-low p-4"
            >
              <legend className="font-bold">{section.title}</legend>
              <label className="mt-2 block text-xs font-bold">
                Condition <FieldBadge required />
                <select
                  value={section.condition}
                  onChange={(e) =>
                    updateSection(index, {
                      condition: e.target.value as ReportCondition,
                    })
                  }
                  className={`${field} bg-white`}
                >
                  {[
                    "excellent",
                    "good",
                    "fair",
                    "poor",
                    "not_inspected",
                    "not_applicable",
                  ].map((condition) => (
                    <option key={condition} value={condition}>
                      {formatLabel(condition)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block text-xs font-bold">
                Comments <FieldBadge />
                <textarea
                  value={section.comments || ""}
                  onChange={(e) =>
                    updateSection(index, { comments: e.target.value })
                  }
                  className={`${field} min-h-20 bg-white`}
                />
              </label>
            </fieldset>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Visible defects (one per line) <FieldBadge />
            <textarea
              value={draft.visibleDefects?.join("\n") || ""}
              onChange={(e) => setLines("visibleDefects", e.target.value)}
              className={`${field} min-h-28`}
            />
          </label>
          <label className="text-sm font-bold">
            Positive observations (one per line) <FieldBadge />
            <textarea
              value={draft.positiveObservations?.join("\n") || ""}
              onChange={(e) => setLines("positiveObservations", e.target.value)}
              className={`${field} min-h-28`}
            />
          </label>
        </div>
        {(
          [
            ["neighbourhoodComments", "Neighbourhood comments"],
            ["roadAccessComments", "Road access comments"],
            ["utilityComments", "Utility comments"],
            ["summary", "Summary"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm font-bold">
            {label} <FieldBadge required={(key === "summary" && summaryRequired) || (key === "neighbourhoodComments" && neighbourhoodRequired)} />
            <textarea
              id={`report-${key}`}
              value={draft[key] || ""}
              onChange={(e) =>
                setDraft((old) => ({ ...old, [key]: e.target.value }))
              }
              className={`${field} min-h-24`}
            />
          </label>
        ))}
        <label className="block text-sm font-bold">
          Recommendation <FieldBadge />
          <select
            value={draft.recommendation || ""}
            onChange={(e) =>
              setDraft((old) => ({
                ...old,
                recommendation: e.target.value as ReportRecommendation,
              }))
            }
            className={field}
          >
            <option value="">Select</option>
            {[
              "recommended",
              "recommended_with_concerns",
              "further_professional_review_required",
              "not_recommended",
              "neutral",
            ].map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.locationConfirmed || false}
            onChange={(e) =>
              setDraft((old) => ({
                ...old,
                locationConfirmed: e.target.checked,
              }))
            }
          />
          I personally confirmed the property location. <FieldBadge required={locationRequired} />
        </label>
        <div className="rounded-xl border border-outline-variant/30 p-4">
          <p className="text-sm">{DECLARATION_TEXT}</p>
          <label className="mt-3 flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.declarationAccepted}
              onChange={(e) =>
                setDraft((old) => ({
                  ...old,
                  declarationAccepted: e.target.checked,
                }))
              }
            />
            I accept this declaration. <FieldBadge required />
          </label>
          <label className="mt-3 block text-sm font-bold">
            Sign by name <FieldBadge />
            <input
              value={draft.signedByName || ""}
              onChange={(e) =>
                setDraft((old) => ({ ...old, signedByName: e.target.value }))
              }
              className={field}
            />
          </label>
        </div>
        {draftMessage ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm text-secondary">{draftMessage}</p> : null}
        <button className={action}>
          Save draft on this device
        </button>
      </form>
    </section>
  );
};

const AdminResolution = ({
  id,
  detail,
  mutate,
  busy = false,
}: {
  id: string;
  detail: ProxyInspectionDetail;
  mutate: (actionName: PendingAction, fn: () => Promise<unknown>, success: string) => Promise<void>;
  busy?: boolean;
}) => {
  const options: Array<[DisputeResolution, string, string]> = [
    [
      "resume_service",
      "Request corrections",
      "Returns work to in progress and unlocks corrections.",
    ],
    [
      "release_inspector",
      "Release to Inspector",
      "Starts Paystack transfer processing; it is not final payment.",
    ],
    [
      "refund_buyer",
      "Refund Buyer",
      "Starts refund processing against the original payment.",
    ],
    [
      "cancel_and_refund",
      "Cancel and refund",
      "Starts refund processing and retains cancellation history.",
    ],
  ];
  const [choice, setChoice] = useState<DisputeResolution>();
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  return (
    <section className={card}>
      <h2 className="text-xl font-black">Admin dispute resolution</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map(([value, label, description]) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => setChoice(value)}
            className={`rounded-xl border p-4 text-left ${choice === value ? "border-primary" : "border-outline-variant/20"}`}
          >
            <strong>{label}</strong>
            <span className="mt-1 block text-xs text-secondary">
              {description}
            </span>
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-bold">
        Required resolution notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${field} min-h-24`}
        />
      </label>
      <button
        disabled={!choice || !notes.trim() || busy}
        onClick={() => {
          if (choice)
            setConfirm({
              title: "Confirm dispute resolution",
              description:
                "Provider processing actions are not terminal until webhook-confirmed. The backend remains authoritative after this action.",
              confirmLabel: "Submit resolution",
              tone: choice === "resume_service" ? "primary" : "danger",
              onConfirm: () => {
                setConfirm(null);
                void mutate(
                  "resolveDispute",
                  () =>
                    proxyNetworkService.resolveDispute(
                      id,
                      choice,
                      notes.trim(),
                    ),
                  "Resolution submitted; refreshing authoritative state.",
                );
              },
            });
        }}
        className={`${action} mt-4`}
      >
        {busy ? "Submitting resolution..." : "Confirm resolution"}
      </button>
      <p className="mt-2 text-xs text-secondary">
        Current dispute: {detail.dispute?.reason}
      </p>
      {confirm ? (
        <ActionConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      ) : null}
    </section>
  );
};

const CompletionActions = ({
  id,
  detail,
  actions,
  mutate,
  busy = false,
  draftVersion = 0,
}: {
  id: string;
  detail: ProxyInspectionDetail;
  actions: ReturnType<typeof selectProxyActions>;
  mutate: (actionName: PendingAction, fn: () => Promise<unknown>, success: string) => Promise<void>;
  busy?: boolean;
  draftVersion?: number;
}) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [ack, setAck] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [categories, setCategories] = useState<
    Record<
      "professionalism" | "accuracy" | "communication" | "timeliness",
      number | undefined
    >
  >({
    professionalism: undefined,
    accuracy: undefined,
    communication: undefined,
    timeliness: undefined,
  });
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const frontendMissing = completionMissingItems(detail, id, draftVersion);
  const canSubmitCompletion = actions.submitCompletion && frontendMissing.length === 0;
  const checklist = [
    {
      label: "Recorded walkthrough",
      ok:
        !detail.request.requestedServices.includes(
          "recorded_video_walkthrough",
        ) ||
        detail.evidence.some((item) => item.category === "walkthrough_video"),
    },
    {
      label: "Inspection photos",
      ok:
        !detail.request.requestedServices.includes("photos") ||
        detail.evidence.some((item) => item.category === "inspection_photo"),
    },
    {
      label: "Report and declaration",
      ok: !frontendMissing.some((item) =>
        [
          "saved structured report",
          "accepted report declaration",
          "inspector signature name",
          "completed report sections",
          "completed report summary",
          "neighbourhood review comments",
          "location confirmation",
          "summary for custom requirements",
        ].includes(item),
      ),
    },
  ];
  return (
    <section className={card}>
      <h2 className="text-xl font-black">Completion, dispute, and review</h2>
      {actions.submitCompletion ? (
        <div className="mt-4">
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label}>
                {item.ok ? "✓" : "○"} {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-secondary">
            Submit completion is enabled only after the requested service requirements are satisfied. The backend validates the saved report and uploaded evidence again.
          </p>
          {frontendMissing.length ? (
            <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Complete these before submitting:</p>
              <ul className="mt-2 list-disc pl-5">
                {frontendMissing.map((item) => (
                  <li key={item}>
                    {item.includes("summary") ? (
                      <>
                        {item} - fill the <a href="#report-summary" className="font-bold underline">Summary</a> field in the condition report editor, then save the draft.
                      </>
                    ) : item.includes("neighbourhood") ? (
                      <>
                        {item} - fill the <a href="#report-neighbourhoodComments" className="font-bold underline">Neighbourhood comments</a> field, then save the draft.
                      </>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            disabled={busy || !canSubmitCompletion}
            className={`${action} mt-4`}
            onClick={() =>
              setConfirm({
                title: "Submit completion",
                description:
                  "This sends the job to the Buyer for review and locks ordinary report editing. RealtiQ will validate the authoritative completion requirements.",
                confirmLabel: "Submit completion",
                onConfirm: () => {
                  if (!canSubmitCompletion) return;
                  setConfirm(null);
                  void mutate(
                    "submitCompletion",
                    async () => {
                      const localDraft = readLocalReportDraft(id);
                      const reportToSave = localDraft
                        ? normalizeReportDraft(localDraft)
                        : detail.report;
                      if (reportToSave) await proxyNetworkService.saveReport(id, reportToSave, !!detail.report);
                      if (localDraft) clearLocalReportDraft(id);
                      return proxyNetworkService.submitCompletion(id);
                    },
                    "Completion submitted for Buyer review.",
                  );
                },
              })
            }
          >
            {busy ? "Submitting completion..." : "Submit completion"}
          </button>
        </div>
      ) : null}
      {actions.confirmCompletion ? (
        <button
          disabled={busy}
          className={`${action} mt-4`}
          onClick={() =>
            setConfirm({
              title: "Confirm reviewed completion",
              description:
                "Confirm only after reviewing the uploaded evidence and condition report. An Admin will initiate payout later; this does not mark the job completed.",
              confirmLabel: "Confirm completion",
              onConfirm: () => {
                setConfirm(null);
                void mutate(
                  "confirmCompletion",
                  () => proxyNetworkService.confirmCompletion(id),
                  "Completion confirmed. Payout is awaiting Admin action.",
                );
              },
            })
          }
        >
          {busy ? "Confirming completion..." : "Confirm reviewed completion"}
        </button>
      ) : null}
      {actions.dispute ? (
        <form
          className="mt-5 space-y-3 rounded-xl bg-red-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim() || !ack || busy) return;
            void mutate(
              "raiseDispute",
              () =>
                proxyNetworkService.dispute(
                  id,
                  reason.trim(),
                  description.trim() || undefined,
                ),
              "Dispute raised.",
            ).then(() => {
              setReason("");
              setDescription("");
            });
          }}
        >
          <h3 className="font-black">Raise a dispute</h3>
          <label className="block text-sm font-bold">
            Reason
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${field} bg-white`}
            />
          </label>
          <label className="block text-sm font-bold">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${field} bg-white`}
            />
          </label>
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand this pauses conflicting completion/payout actions while
            Admin reviews the dispute.
          </label>
          <button disabled={!reason.trim() || !ack || busy} className={action}>
            {busy ? "Raising dispute..." : "Raise dispute"}
          </button>
        </form>
      ) : null}
      {detail.dispute ? (
        <div className="mt-4 rounded-xl border border-red-200 p-4">
          <h3 className="font-bold">
            Dispute: {formatLabel(detail.dispute.status)}
          </h3>
          <p className="mt-2">{detail.dispute.reason}</p>
          {detail.dispute.description ? (
            <p className="mt-1 text-sm text-secondary">
              {detail.dispute.description}
            </p>
          ) : null}
          {detail.dispute.resolution ? (
            <p className="mt-2 text-sm">
              Resolution: {formatLabel(detail.dispute.resolution)} ·{" "}
              {detail.dispute.resolutionNotes}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-secondary">
            If a full refund is approved before the inspector's payout, the complete amount you paid, including the Platform & Protection Fee, will be returned through the original payment method.
          </p>
        </div>
      ) : null}
      {actions.review ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            void mutate(
              "submitReview",
              () =>
                proxyNetworkService.review(id, {
                  rating,
                  ...categories,
                  comment: comment.trim() || undefined,
                }),
              "Review submitted.",
            );
          }}
        >
          <fieldset>
            <legend className="font-bold">Overall rating</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className="rounded-lg bg-surface-container-low p-3"
                >
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />{" "}
                  {value} star{value === 1 ? "" : "s"}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(categories) as Array<keyof typeof categories>).map(
              (key) => (
                <label key={key} className="text-sm font-bold">
                  {formatLabel(key)} (optional)
                  <select
                    value={categories[key] || ""}
                    onChange={(e) =>
                      setCategories((old) => ({
                        ...old,
                        [key]: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    className={field}
                  >
                    <option value="">Not rated</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} / 5
                      </option>
                    ))}
                  </select>
                </label>
              ),
            )}
          </div>
          <label className="block text-sm font-bold">
            Comment
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={field}
            />
          </label>
          <button disabled={busy} className={action}>
            {busy ? "Submitting review..." : "Submit review"}
          </button>
        </form>
      ) : null}
      {confirm ? (
        <ActionConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      ) : null}
    </section>
  );
};

const ProxyWorkspace = ({
  detail,
  requestId,
  role,
  reload,
  payoutVerified = false,
}: {
  detail: ProxyInspectionDetail;
  requestId: string;
  role: "buyer" | "proxy_inspector" | "admin";
  reload: () => Promise<unknown>;
  payoutVerified?: boolean;
}) => {
  const { user } = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [schedule, setSchedule] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [initializedPayment, setInitializedPayment] =
    useState<PaymentInitializationResponse | null>(null);
  const [reportDraftVersion, setReportDraftVersion] = useState(0);
  const actions = useMemo(
    () =>
      selectProxyActions(
        detail,
        role,
        user?._id,
        payoutVerified || !!detail.payoutAccount?.verifiedAt,
      ),
    [detail, role, user?._id, payoutVerified],
  );
  const pending = pendingAction !== null;
  const isPending = (actionName: PendingAction) => pendingAction === actionName;
  const mutate = async (actionName: PendingAction, fn: () => Promise<unknown>, success: string) => {
    if (pendingAction) return;
    setPendingAction(actionName);
    setMissing([]);
    try {
      await fn();
      toast.success(success);
      invalidateProxyData(requestId);
      await reload();
    } catch (raw) {
      const err = raw instanceof Error ? raw : new Error("Action failed.");
      toast.error(err.message);
      if (raw instanceof ApiRequestError) {
        const details = raw.details as { missing?: string[] } | undefined;
        const missingItems = raw.missing || details?.missing;
        if (missingItems?.length) setMissing(missingItems);
        if ([409, 502].includes(raw.status || 0)) await reload();
      }
    } finally {
      setPendingAction(null);
    }
  };
  const initializePayment = async () => {
    if (pendingAction) return;
    setPendingAction("initializePayment");
    setMissing([]);
    try {
      const result = await proxyNetworkService.initializePayment(requestId);
      setInitializedPayment(result);
      sessionStorage.setItem(
        "realtiq.proxyPaymentContext",
        JSON.stringify({ reference: result.reference, requestId }),
      );
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
      } else {
        toast.error(
          result.message ||
            "Payment was initialized, but the backend did not return a checkout link.",
        );
      }
    } catch (raw) {
      const err = raw instanceof Error ? raw : new Error("Unable to initialize payment.");
      toast.error(err.message);
      if (raw instanceof ApiRequestError) {
        const details = raw.details as { missing?: string[] } | undefined;
        const missingItems = raw.missing || details?.missing;
        if (missingItems?.length) setMissing(missingItems);
        if ([409, 502].includes(raw.status || 0)) await reload();
      }
    } finally {
      setPendingAction(null);
    }
  };
  const property =
    typeof detail.request.property === "string"
      ? null
      : detail.request.property;
  const pricing = detailPricing(detail);
  const hasAuthoritativePricing = Boolean(detail.pricing || detail.serviceEscrow);
  const proposedAmount = Number(price);
  const proposalEstimate =
    Number.isInteger(proposedAmount) && proposedAmount > 0
      ? estimateProxyPricing(proposedAmount, pricing)
      : null;
  const initializedPricing = initializedPayment?.pricing
    ? normalizeProxyPricing(initializedPayment.pricing)
    : null;
  return (
    <div className="space-y-5" aria-busy={pending}>
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">
              {property?.publicReference || "Private inspection job"}
            </p>
            <h1 className="mt-1 text-3xl font-black">
              {property?.title || "Property inspection"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              Request status: {formatLabel(detail.request.status)}
            </p>
          </div>
          <button
            disabled={pending}
            onClick={() => void reload()}
            className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {pending ? "Action in progress..." : "Refresh latest state"}
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-secondary">Buyer</p>
            <p>
              {typeof detail.request.buyer === "string"
                ? "Buyer"
                : detail.request.buyer.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-secondary">
              Independent RealtiQ Verified Property Agent
            </p>
            <p>
              {typeof detail.request.inspector === "string"
                ? "RealtiQ Verified Property Agent"
                : detail.request.inspector.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-secondary">
              Requested services
            </p>
            <p>
              {detail.request.requestedServices.map(formatLabel).join(", ")}
            </p>
          </div>
        </div>
        {detail.request.customRequirements ? (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-sm">
            <strong>Custom requirements:</strong>{" "}
            {detail.request.customRequirements}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-secondary">
          The RealtiQ Verified Property Agent is an independent third party, not
          a RealtiQ employee. This job uses uploaded recorded media and does not
          include live video or calls.
        </p>
        {role === "buyer" ? (
          <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-secondary">
            RealtiQ adds a {percentNoticeLabel(pricing.buyerFeePercentage)} Platform & Protection Fee to your agreed inspection price. This supports secure payment processing, service coordination, dispute assistance and refund protection. Your payment is held securely, and the inspector is only paid after the service is completed and approved.
          </p>
        ) : null}
        {role === "proxy_inspector" ? (
          <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-secondary">
            RealtiQ deducts a {percentNoticeLabel(pricing.inspectorCommissionPercentage)} commission from the agreed inspection fee. This supports client acquisition, secure payment collection, task coordination, dispute support and reliable payout processing.
          </p>
        ) : null}
      </section>
      <Lifecycle detail={detail} />
      <section className={card}>
        <h2 className="text-xl font-black">Price negotiation</h2>
        <p className="mt-2 text-3xl font-black">
          {formatNgn(
            detail.request.proposedPrice || detail.request.agreedPrice,
          )}
        </p>
        <div className="mt-3 flex gap-5 text-sm">
          <span>
            {detail.request.buyerPriceConfirmed ? "✓" : "○"} Buyer confirmed
          </span>
          <span>
            {detail.request.inspectorPriceConfirmed ? "✓" : "○"} Inspector
            confirmed
          </span>
        </div>
        {detail.request.priceLockedAt ? (
          <p className="mt-2 text-sm text-emerald-800">
            Price locked on{" "}
            {new Date(detail.request.priceLockedAt).toLocaleString()}.
          </p>
        ) : null}
        {actions.proposePrice ? (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const amount = Number(price);
                if (pending) return;
                if (!Number.isInteger(amount) || amount <= 0) {
                  toast.error("Enter a positive whole-naira amount.");
                  return;
                }
                void mutate(
                  "proposePrice",
                  () => proxyNetworkService.proposePrice(requestId, amount),
                  "New price proposed; both confirmations were reset.",
                );
            }}
          >
            <label className="flex-1 text-sm font-bold">
              Whole NGN amount
              <input
                inputMode="numeric"
                pattern="[0-9]+"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                className={field}
              />
            </label>
            <button disabled={pending} className={`${action} self-end`}>
              {isPending("proposePrice") ? "Proposing..." : "Propose"}
            </button>
          </form>
        ) : null}
        {proposalEstimate && role === "buyer" ? (
          <BuyerPricingBreakdown pricing={proposalEstimate} estimated />
        ) : null}
        {proposalEstimate && role === "proxy_inspector" ? (
          <InspectorPricingBreakdown pricing={proposalEstimate} estimated />
        ) : null}
        {pricing.agreedPrice && !proposalEstimate && role === "buyer" && hasAuthoritativePricing ? (
          <BuyerPricingBreakdown pricing={pricing} />
        ) : null}
        {pricing.agreedPrice && !proposalEstimate && role === "proxy_inspector" && hasAuthoritativePricing ? (
          <InspectorPricingBreakdown pricing={pricing} />
        ) : null}
        {actions.confirmPrice ? (
          <button
            disabled={pending}
            className={`${action} mt-4`}
            onClick={() =>
              setConfirm({
                title: "Confirm current price",
                description: `Confirm the current proposed price of ${formatNgn(detail.request.proposedPrice)}. Both parties must independently confirm the same amount before payment can begin.`,
                confirmLabel: "Confirm price",
                onConfirm: () => {
                  setConfirm(null);
                  void mutate(
                    "confirmPrice",
                    () => proxyNetworkService.confirmPrice(requestId),
                    "Price confirmation recorded.",
                  );
                },
              })
            }
          >
            {isPending("confirmPrice") ? "Confirming price..." : "Confirm current price"}
          </button>
        ) : null}
      </section>
      <section className={card}>
        <h2 className="text-xl font-black">Payment and service escrow</h2>
        {hasAuthoritativePricing ? (
          role === "admin" ? (
            <AdminPricingBreakdown pricing={pricing} />
          ) : role === "proxy_inspector" ? (
            <InspectorPricingBreakdown pricing={pricing} />
          ) : (
            <BuyerPricingBreakdown pricing={pricing} />
          )
        ) : (
          <p className="mt-3 text-secondary">
            Financial split will appear only after a ServiceEscrow is created.
          </p>
        )}
        {detail.serviceEscrow ? (
          <p className="mt-3 text-xs text-secondary">
            Escrow status: {formatLabel(detail.serviceEscrow.status)}
            {detail.serviceEscrow.paymentReference ? ` · Payment reference: ${detail.serviceEscrow.paymentReference}` : ""}
            {detail.serviceEscrow.transferReference ? ` · Payout reference: ${detail.serviceEscrow.transferReference}` : ""}
            {detail.serviceEscrow.refundReference ? ` · Refund reference: ${detail.serviceEscrow.refundReference}` : ""}
          </p>
        ) : null}
        {actions.initializePayment ? (
          <div className="mt-4">
            <button
              className={action}
              disabled={pending}
              onClick={() => void initializePayment()}
            >
              {isPending("initializePayment") ? "Loading payment total..." : "Load secure payment total"}
            </button>
            {initializedPricing ? (
              <div className="mt-4 rounded-xl border border-primary/20 p-4">
                <BuyerPricingBreakdown pricing={initializedPricing} />
                {initializedPayment?.message ? (
                  <p role="status" className="mt-3 text-sm text-secondary">
                    {initializedPayment.message}
                  </p>
                ) : null}
                {initializedPayment?.redirectUrl ? (
                  <button
                    type="button"
                    className={`${action} mt-4`}
                    onClick={() =>
                      window.location.assign(initializedPayment.redirectUrl!)
                    }
                  >
                    Pay {formatNgn(initializedPricing.buyerTotalAmount)} securely
                  </button>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-lg bg-surface-container-high px-4 py-3 text-sm font-bold disabled:opacity-50"
                      onClick={() => void mutate("refreshStatus", reload, "Status refreshed.")}
                    >
                      {isPending("refreshStatus") ? "Refreshing..." : "Refresh status"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-outline px-4 py-3 text-sm font-bold"
                      disabled={pending}
                      onClick={() => void initializePayment()}
                    >
                      {isPending("initializePayment") ? "Retrying..." : "Retry initialization"}
                    </button>
                  </div>
                )}
              </div>
            ) : initializedPayment ? (
              <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                {initializedPayment.message ||
                  "Payment was initialized, but the backend did not return pricing. Refresh this job before continuing."}
              </p>
            ) : null}
          </div>
        ) : null}
        {detail.serviceEscrow &&
        ["release_processing", "refund_processing"].includes(
          detail.serviceEscrow.status,
        ) ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 font-bold">
            {detail.serviceEscrow.status === "release_processing"
              ? "Payout processing"
              : "Refund processing"}{" "}
            — awaiting provider webhook confirmation.
          </p>
        ) : null}
      </section>
      {actions.schedule || detail.request.scheduledAt ? (
        <section className={card}>
          <h2 className="text-xl font-black">Confirmed inspection time</h2>
          <p className="mt-2 text-sm text-secondary">
            The preferred date is the buyer's requested time. The Property Agent confirms the actual appointment after payment is funded.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-container-low p-3">
              <dt className="text-xs font-bold text-secondary">Buyer preferred date</dt>
              <dd className="mt-1 font-bold">
                {detail.request.preferredDate
                  ? new Date(detail.request.preferredDate).toLocaleString(undefined, { timeZoneName: "short" })
                  : "No preference provided"}
              </dd>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <dt className="text-xs font-bold text-secondary">Confirmed inspection appointment</dt>
              <dd className="mt-1 font-bold">
                {detail.request.scheduledAt
                  ? new Date(detail.request.scheduledAt).toLocaleString(undefined, { timeZoneName: "short" })
                  : "Not confirmed yet"}
              </dd>
            </div>
          </dl>
          {actions.schedule ? (
            <form
              className="mt-4 flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const date = new Date(schedule);
                if (pending) return;
                if (date > new Date())
                  void mutate(
                    "schedule",
                    () =>
                      proxyNetworkService.schedule(
                        requestId,
                        date.toISOString(),
                      ),
                    "Schedule updated.",
                  );
              }}
            >
              <label className="text-sm font-bold">
                Confirm or update inspection appointment as the Property Agent
                <input
                  required
                  type="datetime-local"
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className={field}
                />
              </label>
              <button disabled={pending} className={`${action} self-end`}>
                {isPending("schedule")
                  ? detail.request.scheduledAt
                    ? "Updating appointment..."
                    : "Confirming appointment..."
                  : detail.request.scheduledAt
                    ? "Update appointment"
                    : "Confirm appointment"}
              </button>
            </form>
          ) : role === "buyer" && ["funded", "scheduled"].includes(detail.request.status) ? (
            <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-secondary">
              The Property Agent is responsible for confirming the appointment. Use the private job conversation to request a change.
            </p>
          ) : null}
          {actions.start ? (
            <button
              disabled={pending}
              className={`${action} mt-4`}
              onClick={() =>
                setConfirm({
                  title: "Start inspection",
                  description:
                    "Start this funded inspection now. This moves the job into active work.",
                  confirmLabel: "Start inspection",
                  onConfirm: () => {
                    setConfirm(null);
                    void mutate(
                      "start",
                      () => proxyNetworkService.start(requestId),
                      "Inspection started.",
                    );
                  },
                })
              }
            >
              {isPending("start") ? "Starting inspection..." : "Start inspection"}
            </button>
          ) : null}
        </section>
      ) : null}
      <ConversationPanel id={requestId} detail={detail} mutate={mutate} busy={isPending("sendMessage")} />
      <EvidenceGallery
        id={requestId}
        evidence={detail.evidence || []}
        canUpload={actions.uploadEvidence}
        mutate={mutate}
        busy={isPending("uploadEvidence")}
      />
      <ReportPanel
        key={`${detail.report?._id || "new"}-${detail.report?.signedAt || ""}`}
        id={requestId}
        report={detail.report}
        editable={actions.editReport}
        requestedServices={detail.request.requestedServices}
        busy={isPending("saveDraft")}
        onLocalDraftSaved={() => setReportDraftVersion((value) => value + 1)}
      />
      {missing.length ? (
        <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-900">
          <h2 className="font-black">
            Inspection completion requirements are missing
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <CompletionActions
        id={requestId}
        detail={detail}
        actions={actions}
        mutate={mutate}
        busy={isPending("submitCompletion") || isPending("confirmCompletion") || isPending("raiseDispute") || isPending("submitReview")}
        draftVersion={reportDraftVersion}
      />
      {actions.releasePayment ? (
        <section className={card}>
          <h2 className="text-xl font-black">Admin payout</h2>
          <AdminPricingBreakdown pricing={pricing} />
          <button
            disabled={pending}
            className={`${action} mt-4`}
            onClick={() =>
              setConfirm({
                title: "Initiate Property Agent payout",
                description:
                  "This starts Paystack transfer processing. Do not treat the payout as paid or completed until the provider webhook updates the backend state.",
                confirmLabel: "Initiate payout",
                tone: "danger",
                onConfirm: () => {
                  setConfirm(null);
                  void mutate(
                    "releasePayment",
                    () => proxyNetworkService.releasePayment(requestId),
                    "Payout processing started.",
                  );
                },
              })
            }
          >
            {isPending("releasePayment") ? "Initiating payout..." : "Initiate payout"}
          </button>
        </section>
      ) : role === "admin" &&
        detail.request.status === "release_pending" &&
        !detail.payoutAccount?.verifiedAt ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm">
          Payout is unavailable until the Inspector has a verified payout
          account.
        </p>
      ) : null}
      {actions.resolveDispute ? (
        <AdminResolution id={requestId} detail={detail} mutate={mutate} busy={isPending("resolveDispute")} />
      ) : null}
      {role === "proxy_inspector" && !payoutVerified ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm">
          No verified payout account is configured. This does not block work, but it can delay payout.{" "}
          <Link
            className="font-bold underline"
            to="/proxy-inspector/payout-account"
          >
            Configure payout account
          </Link>
          .
        </p>
      ) : null}
      {role === "admin" && detail.auditHistory?.length ? (
        <section className={card}>
          <h2 className="text-xl font-black">Audit history</h2>
          <ol className="mt-4 border-l pl-5">
            {detail.auditHistory.map((entry) => (
              <li key={entry._id} className="mb-4">
                <p className="font-bold">{formatLabel(entry.action)}</p>
                <p className="text-sm text-secondary">
                  {formatLabel(entry.oldStatus)} →{" "}
                  {formatLabel(entry.newStatus)} ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {confirm ? (
        <ActionConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      ) : null}
    </div>
  );
};
export default ProxyWorkspace;
