import { useCallback, useEffect, useState } from "react";
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
          <p className={"mt-2 text-sm text-secondary"}>Appeal resolution and trust recomputation require a one-use security challenge. Review access remains available.</p>
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
                          type="button"
                          disabled
                          title="Appeal resolution requires a one-use security challenge."
                          className={
                            "rounded-lg bg-primary px-3 py-2 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                          }
                        >
                          Resolve
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled
                        title="Trust recomputation requires a one-use security challenge."
                        className={
                          "rounded-lg bg-surface-container-low px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-60"
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
      </main>
    </AdminLayout>
  );
};
export default TrustAppeals;
