import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import StepUpDialog from "../../../components/auth/StepUpDialog";
import AdminLayout from "../../../components/layout/AdminLayout";
import ErrorState from "../../../components/ui/ErrorState";
import LoadingState from "../../../components/ui/LoadingState";
import { useBoundStepUp } from "../../../hooks/useBoundStepUp";
import { trustService } from "../../../services/trustService";
import type {
  AppealStatus,
  Pagination,
  ResolveAppealInput,
  ResolveAppealResult,
  TrustAppeal,
} from "../../../types/phase45";

interface ResolutionDraft {
  appeal: TrustAppeal;
  action: Exclude<AppealStatus, "open">;
  reason: string;
  reviewAt: string;
  expiresAt: string;
  badge: string;
  score: string;
  band: string;
}

const TrustAppeals = () => {
  const [appeals, setAppeals] = useState<TrustAppeal[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState<AppealStatus | "">("open");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState<ResolutionDraft | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const resolveStepUp = useBoundStepUp<ResolveAppealResult>();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await trustService.adminQueue({ page, limit: 20, status });
      setAppeals(result.appeals);
      setPagination(result.pagination);
    } catch (raw) {
      setError(
        raw instanceof Error ? raw.message : "Unable to load appeal queue.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => {
    void load();
  }, [load]);

  const prepareResolution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolutionDraft || !resolutionDraft.appeal._id || resolutionBusy || resolveStepUp.busy || resolveStepUp.challenge) return;
    const reviewAt = resolutionDraft.reviewAt ? new Date(resolutionDraft.reviewAt) : null;
    const expiresAt = resolutionDraft.expiresAt ? new Date(resolutionDraft.expiresAt) : null;
    if ((reviewAt && !Number.isFinite(reviewAt.getTime())) || (expiresAt && !Number.isFinite(expiresAt.getTime()))) { setResolutionMessage("Enter valid review and expiry dates."); return; }
    const body: ResolveAppealInput = {
      action: resolutionDraft.action,
      reason: resolutionDraft.reason.trim(),
      ...(reviewAt ? { reviewAt: reviewAt.toISOString() } : {}),
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      ...(resolutionDraft.badge ? { badge: resolutionDraft.badge as ResolveAppealInput["badge"] } : {}),
      ...(resolutionDraft.score !== "" ? { score: Number(resolutionDraft.score) } : {}),
      ...(resolutionDraft.band ? { band: resolutionDraft.band as ResolveAppealInput["band"] } : {}),
    };
    if (!body.reason || body.reason.length > 2000) { setResolutionMessage("Enter a resolution reason of up to 2,000 characters."); return; }
    if (body.action === "adjusted" && !body.reviewAt && !body.expiresAt) { setResolutionMessage("An adjusted decision needs a future review date or expiry date."); return; }
    if (body.score !== undefined && (!Number.isInteger(body.score) || body.score < 0 || body.score > 100)) { setResolutionMessage("Score must be a whole number from 0 to 100."); return; }
    const id = resolutionDraft.appeal._id;
    setResolutionMessage("");
    const started = await resolveStepUp.begin({
      method: "PATCH",
      path: `/api/trust/v1/admin/appeals/${encodeURIComponent(id)}`,
      body,
      label: `Resolve trust appeal ${resolutionDraft.appeal.publicReference}`,
      execute: (challengeId, exactBody) => trustService.resolveAppeal(id, exactBody, challengeId),
    });
    if (!started) setResolutionMessage(resolveStepUp.getError() ?? "The protected review could not start. Refresh the appeal and try again.");
  };

  const completeResolution = async (code: string): Promise<boolean> => {
    setResolutionBusy(true);
    try {
      const result = await resolveStepUp.complete(code);
      if (!result.ok) {
        setResolutionMessage(result.error ?? "The appeal decision was not accepted. Review the refreshed server state before another attempt.");
        await load();
        return false;
      }
      setResolutionDraft(null);
      setResolutionMessage(`The appeal ${result.value.appeal.status} decision was recorded by the server.`);
      await load();
      return true;
    } finally { setResolutionBusy(false); }
  };
  return (
    <AdminLayout>
      <main className={"space-y-6 p-4 sm:p-8"}>
        <header>
          <p
            className={
              "text-xs font-bold uppercase tracking-widest text-secondary"
            }
          >
            Authorized review
          </p>
          <h1 className={"mt-2 text-3xl font-black"}>Trust appeals</h1>
          <p className={"mt-2 text-sm text-secondary"}>
            Resolution details and reviewer data remain inside this admin-only
            queue.
          </p>
          <p className={"mt-2 text-sm text-secondary"}>Appeal resolutions use the documented versioned server state and a fresh bound authenticator challenge. Trust recomputation remains unavailable until the no-body challenge binding is specified.</p>
        </header>
        <label className={"block max-w-xs text-sm font-bold"}>
          Status filter
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AppealStatus | "");
              setPage(1);
            }}
            className={"mt-1 w-full rounded-lg bg-white p-3"}
          >
            <option value={""}>All statuses</option>
            {(
              ["open", "upheld", "adjusted", "dismissed"] as AppealStatus[]
            ).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {loading ? <LoadingState label={"Loading appeal queue..."} /> : null}
        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : null}
        <div className={"overflow-x-auto rounded-xl bg-white"}>
          <table className={"w-full text-left text-sm"}>
            <thead>
              <tr>
                <th className={"p-4"}>Appeal</th>
                <th className={"p-4"}>Account</th>
                <th className={"p-4"}>Status</th>
                <th className={"p-4"}>Submitted</th>
                <th className={"p-4"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((appeal) => (
                <Fragment key={appeal.publicReference}>
                <tr
                  className={"border-t align-top"}
                >
                  <td className={"max-w-md p-4"}>
                    <strong>{appeal.publicReference}</strong>
                    <p className={"mt-1"}>{appeal.reason}</p>
                    <p className={"mt-1 text-xs text-secondary"}>
                      Policy {appeal.decisionVersion}
                    </p>
                  </td>
                  <td className={"p-4"}>
                    {typeof appeal.user === "object" ? (
                      <>
                        <strong>{appeal.user.name}</strong>
                        <p className={"capitalize text-secondary"}>
                          {appeal.user.role}
                        </p>
                      </>
                    ) : (
                      "Account unavailable"
                    )}
                  </td>
                  <td className={"p-4 capitalize"}>{appeal.status}</td>
                  <td className={"p-4"}>
                    {new Date(appeal.createdAt).toLocaleString("en-NG")}
                  </td>
                  <td className={"p-4"}>
                    <div className={"flex flex-col gap-2"}>
                      {appeal.status === "open" ? (
                        <button
                          type="button"
                          disabled={!appeal._id || resolveStepUp.busy || Boolean(resolveStepUp.challenge)}
                          onClick={() => { setResolutionMessage(""); setResolutionDraft({ appeal, action: "upheld", reason: "", reviewAt: "", expiresAt: "", badge: "", score: "", band: "" }); }}
                          className={"rounded-lg bg-primary px-3 py-2 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"}
                        >
                          Review decision
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled
                        title="The route is documented as bodyless, but the bound step-up contract does not define how its absent JSON body is represented."
                        className={
                          "rounded-lg bg-surface-container-low px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                        }
                      >
                        Recompute trust
                      </button>
                    </div>
                  </td>
                </tr>
              {resolutionDraft?.appeal.publicReference === appeal.publicReference ? <tr key="resolution-form" className="border-t bg-surface-container-low"><td colSpan={5} className="p-4"><form onSubmit={(event) => void prepareResolution(event)} className="grid gap-3 rounded-lg bg-white p-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><h3 className="font-bold">Resolve {appeal.publicReference}</h3><p className="mt-1 text-xs text-secondary">The current policy and independent-review rule are rechecked by the server. Stale decisions require a fresh review.</p></div>
                <label className="text-sm font-semibold">Decision<select className="mt-1 block w-full rounded border p-2" value={resolutionDraft.action} onChange={(event) => setResolutionDraft({ ...resolutionDraft, action: event.target.value as Exclude<AppealStatus, "open"> })}><option value="upheld">Uphold</option><option value="adjusted">Adjust</option><option value="dismissed">Dismiss</option></select></label>
                <label className="text-sm font-semibold">Reason<textarea className="mt-1 block w-full rounded border p-2" value={resolutionDraft.reason} maxLength={2000} onChange={(event) => setResolutionDraft({ ...resolutionDraft, reason: event.target.value })} required rows={2} /></label>
                {resolutionDraft.action === "adjusted" ? <><label className="text-sm font-semibold">Review at<input type="datetime-local" className="mt-1 block w-full rounded border p-2" value={resolutionDraft.reviewAt} onChange={(event) => setResolutionDraft({ ...resolutionDraft, reviewAt: event.target.value })} /></label><label className="text-sm font-semibold">Expires at<input type="datetime-local" className="mt-1 block w-full rounded border p-2" value={resolutionDraft.expiresAt} onChange={(event) => setResolutionDraft({ ...resolutionDraft, expiresAt: event.target.value })} /></label></> : null}
                <label className="text-sm font-semibold">Badge (optional)<select className="mt-1 block w-full rounded border p-2" value={resolutionDraft.badge} onChange={(event) => setResolutionDraft({ ...resolutionDraft, badge: event.target.value })}><option value="">Keep current policy result</option>{["none", "bronze", "silver", "gold"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="text-sm font-semibold">Band (optional)<select className="mt-1 block w-full rounded border p-2" value={resolutionDraft.band} onChange={(event) => setResolutionDraft({ ...resolutionDraft, band: event.target.value })}><option value="">Keep current policy result</option>{["insufficient", "low", "standard", "strong", "excellent"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="text-sm font-semibold">Score (optional)<input type="number" min={0} max={100} step={1} className="mt-1 block w-full rounded border p-2" value={resolutionDraft.score} onChange={(event) => setResolutionDraft({ ...resolutionDraft, score: event.target.value })} /></label>
                <div className="flex items-end justify-end gap-3"><button type="button" className="text-sm underline" onClick={() => setResolutionDraft(null)}>Cancel</button><button type="submit" disabled={resolveStepUp.busy || Boolean(resolveStepUp.challenge) || !resolutionDraft.reason.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Review with authenticator</button></div>
                {resolutionMessage ? <p role="status" className="sm:col-span-2 text-sm text-amber-900">{resolutionMessage}</p> : null}
              </form></td></tr> : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!loading && !appeals.length ? (
            <p className={"p-8 text-center text-secondary"}>
              No appeals match this filter.
            </p>
          ) : null}
        </div>
        {pagination ? (
          <div className={"flex items-center justify-between"}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((old) => old - 1)}
              className={"rounded-lg bg-white px-4 py-2 disabled:opacity-50"}
            >
              Previous
            </button>
            <span className={"text-sm"}>
              Page {pagination.page} of {Math.max(pagination.pages, 1)}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((old) => old + 1)}
              className={"rounded-lg bg-white px-4 py-2 disabled:opacity-50"}
            >
              Next
            </button>
          </div>
        ) : null}
        {resolutionMessage && !resolutionDraft ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{resolutionMessage}</p> : null}
        <StepUpDialog challenge={resolveStepUp.challenge} busy={resolutionBusy || resolveStepUp.busy} error={resolveStepUp.error} onCancel={resolveStepUp.cancel} onSubmit={completeResolution} />
      </main>
    </AdminLayout>
  );
};
export default TrustAppeals;
