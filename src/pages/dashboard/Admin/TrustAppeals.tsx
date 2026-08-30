import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import ErrorState from "../../../components/ui/ErrorState";
import LoadingState from "../../../components/ui/LoadingState";
import { trustService } from "../../../services/trustService";
import type {
  AppealStatus,
  Pagination,
  TrustAppeal,
} from "../../../types/phase45";

const TrustAppeals = () => {
  const [appeals, setAppeals] = useState<TrustAppeal[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState<AppealStatus | "">("open");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TrustAppeal | null>(null);
  const [action, setAction] = useState<Exclude<AppealStatus, "open">>("upheld");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
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
  useEffect(() => {
    if (selected) reasonRef.current?.focus();
  }, [selected]);
  const resolve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected?._id || working || !reason.trim()) return;
    setWorking(true);
    setError("");
    try {
      await trustService.resolveAppeal(selected._id, {
        action,
        reason: reason.trim().slice(0, 2000),
      });
      setSelected(null);
      setReason("");
      await load();
    } catch (raw) {
      setError(
        raw instanceof Error ? raw.message : "Unable to resolve appeal.",
      );
    } finally {
      setWorking(false);
    }
  };
  const recompute = async (appeal: TrustAppeal) => {
    const userId =
      typeof appeal.user === "object" ? appeal.user._id : appeal.user;
    if (!userId || working) return;
    setWorking(true);
    try {
      await trustService.recompute(userId);
      await load();
    } catch (raw) {
      setError(
        raw instanceof Error ? raw.message : "Unable to recompute trust.",
      );
    } finally {
      setWorking(false);
    }
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
                <tr
                  key={appeal.publicReference}
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
                          onClick={() => setSelected(appeal)}
                          className={
                            "rounded-lg bg-primary px-3 py-2 font-bold text-on-primary"
                          }
                        >
                          Resolve
                        </button>
                      ) : null}
                      <button
                        disabled={working}
                        onClick={() => void recompute(appeal)}
                        className={
                          "rounded-lg bg-surface-container-low px-3 py-2 font-bold disabled:opacity-60"
                        }
                      >
                        Recompute trust
                      </button>
                    </div>
                  </td>
                </tr>
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
        {selected ? (
          <div
            className={
              "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            }
            role={"presentation"}
          >
            <section
              role={"dialog"}
              aria-modal={"true"}
              aria-labelledby={"resolve-title"}
              className={"w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"}
            >
              <h2 id={"resolve-title"} className={"text-2xl font-black"}>
                Resolve {selected.publicReference}
              </h2>
              <p className={"mt-2 text-sm text-secondary"}>
                Confirm a deliberate outcome. This action does not
                optimistically change the trust score.
              </p>
              <form className={"mt-5 space-y-4"} onSubmit={resolve}>
                <label className={"block text-sm font-bold"}>
                  Action
                  <select
                    value={action}
                    onChange={(e) =>
                      setAction(e.target.value as Exclude<AppealStatus, "open">)
                    }
                    className={
                      "mt-1 w-full rounded-lg bg-surface-container-low p-3"
                    }
                  >
                    <option value={"upheld"}>Upheld</option>
                    <option value={"adjusted"}>Adjusted</option>
                    <option value={"dismissed"}>Dismissed</option>
                  </select>
                </label>
                <label className={"block text-sm font-bold"}>
                  Resolution reason
                  <textarea
                    ref={reasonRef}
                    required
                    maxLength={2000}
                    rows={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={
                      "mt-1 w-full rounded-lg bg-surface-container-low p-3"
                    }
                  />
                </label>
                <div className={"flex justify-end gap-3"}>
                  <button
                    type={"button"}
                    onClick={() => setSelected(null)}
                    className={
                      "rounded-lg bg-surface-container-low px-4 py-2 font-bold"
                    }
                  >
                    Cancel
                  </button>
                  <button
                    disabled={working}
                    className={
                      "rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-60"
                    }
                  >
                    {working ? "Resolving…" : "Confirm resolution"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </main>
    </AdminLayout>
  );
};
export default TrustAppeals;
