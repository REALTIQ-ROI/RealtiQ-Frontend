import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { ApiRequestError } from "../../lib/axios";
import { adminSearchService } from "../../services/adminSearchService";
import type {
  AdminSearchResponse,
  AdminSearchResult,
  AdminSearchType,
} from "../../types/adminSearch";
import {
  ADMIN_SEARCH_TYPES,
  dedupeAdminResults,
  isSafeAdminSearchRoute,
  matchedFieldLabel,
  normalizeAdminSearchQuery,
  typeMeta,
} from "../../features/adminSearch/adminSearch";
import { adminSearchCache } from "../../features/adminSearch/cache";

const LIMIT = 20;
const dateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown update time"
    : `Updated ${date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`;
};
const statusLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const queryLength = (value: string) => Array.from(value).length;
const hasControls = (value: string) =>
  Array.from(value).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );

const errorMessage = (error: unknown) => {
  const status = error instanceof ApiRequestError ? error.status : undefined;
  if (status === 400)
    return error instanceof Error
      ? error.message
      : "Check the search text and filter.";
  if (status === 403)
    return "You no longer have permission to search admin records.";
  if (status === 429) return "Too many searches. Please wait and try again.";
  if (status === 503) return "Admin search is temporarily unavailable.";
  return error instanceof Error
    ? error.message
    : "Admin search could not be completed.";
};

const AdminGlobalSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [type, setType] = useState<"" | AdminSearchType>("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [pagination, setPagination] = useState<
    AdminSearchResponse["pagination"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const restoringFocusRef = useRef(false);
  const normalized = useMemo(() => normalizeAdminSearchQuery(input), [input]);
  const invalid = hasControls(normalized) || queryLength(normalized) > 100;
  const valid = queryLength(normalized) >= 2 && !invalid;

  useEffect(() => {
    if (user?.role !== "admin") {
      controllerRef.current?.abort();
      adminSearchCache.clear();
      setResults([]);
      setOpen(false);
    }
  }, [user?._id, user?.role]);

  const request = async (page: number, append: boolean) => {
    if (!user || user.role !== "admin" || !valid) return;
    const key = `${user._id}|${normalized}|${type}|${page}|${LIMIT}`;
    const cached = adminSearchCache.get(key);
    if (cached) {
      setResults((old) =>
        append
          ? dedupeAdminResults([...old, ...cached.results])
          : cached.results,
      );
      setPagination(cached.pagination);
      setActive(-1);
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const response = await adminSearchService.search(
        { q: normalized, page, limit: LIMIT, ...(type ? { type } : {}) },
        controller.signal,
      );
      if (controller.signal.aborted || id !== requestRef.current) return;
      adminSearchCache.set(key, response);
      setResults((old) =>
        append
          ? dedupeAdminResults([...old, ...response.results])
          : response.results,
      );
      setPagination(response.pagination);
      setActive(-1);
    } catch (caught) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      const status =
        caught instanceof ApiRequestError ? caught.status : undefined;
      if (status === 403) {
        adminSearchCache.clear();
        setResults([]);
        setOpen(false);
        toast.error("You no longer have permission to search admin records.");
      }
      setError(errorMessage(caught));
    } finally {
      if (!controller.signal.aborted && id === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Request identity and abort checks deliberately guard this asynchronous effect.
  useEffect(() => {
    controllerRef.current?.abort();
    setPagination(null);
    setResults([]);
    setActive(-1);
    setError("");
    if (!open || !valid || user?.role !== "admin") {
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => void request(1, false), 300);
    return () => {
      window.clearTimeout(timer);
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, type, open, user?._id, user?.role]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  if (user?.role !== "admin") return null;
  const close = () => {
    restoringFocusRef.current = true;
    setOpen(false);
    setActive(-1);
    window.setTimeout(() => { restoringFocusRef.current = false; }, 50);
    window.setTimeout(
      () =>
        (window.matchMedia("(min-width: 640px)").matches
          ? desktopInputRef.current
          : triggerRef.current
        )?.focus(),
      0,
    );
  };
  const select = (result: AdminSearchResult) => {
    if (!isSafeAdminSearchRoute(result.route)) return;
    close();
    void navigate(result.route);
  };
  const onKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value >= results.length - 1 ? 0 : value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value <= 0 ? results.length - 1 : value - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(results.length - 1);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      select(results[active]);
    }
  };
  const searchInput = (ref: { current: HTMLInputElement | null }) => (
    <div className="relative">
      <span
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        search
      </span>
      <input
        ref={ref}
        type="search"
        role="combobox"
        aria-label="Search admin records"
        aria-expanded={open}
        aria-controls="admin-search-results"
        aria-activedescendant={
          active >= 0 ? `admin-search-option-${active}` : undefined
        }
        autoComplete="off"
        maxLength={101}
        value={input}
        onFocus={() => { if (!restoringFocusRef.current) setOpen(true); }}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeys}
        className="w-full rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
        placeholder="Search admin records..."
      />
    </div>
  );

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xl">
      <div className="hidden sm:block">{searchInput(desktopInputRef)}</div>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open admin record search"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low sm:hidden"
        onClick={() => {
          setOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 0);
        }}
      >
        <span className="material-symbols-outlined">search</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
            aria-label="Close admin search"
            onClick={close}
          />
          <section
            role="dialog"
            aria-label="Admin record search"
            className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-white p-4 shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:right-0 sm:top-12 sm:max-h-[min(75vh,44rem)] sm:rounded-xl sm:border sm:p-3"
          >
            <div className="mb-3 sm:hidden">{searchInput(mobileInputRef)}</div>
            <div className="flex items-center gap-2">
              <label htmlFor="admin-search-type" className="sr-only">
                Record type
              </label>
              <select
                id="admin-search-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "" | AdminSearchType)
                }
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm"
              >
                {ADMIN_SEARCH_TYPES.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div
              className="mt-3 min-h-0 overflow-y-auto"
              aria-busy={loading || loadingMore}
            >
              {!normalized ? (
                <p className="p-4 text-sm text-secondary">
                  Search names, emails, phone numbers, public or provider
                  references, titles, locations, and statuses.
                </p>
              ) : queryLength(normalized) < 2 ? (
                <p className="p-4 text-sm" role="status">
                  Enter at least 2 characters.
                </p>
              ) : invalid ? (
                <p className="p-4 text-sm text-error" role="alert">
                  Search must contain at most 100 visible characters and no
                  control characters.
                </p>
              ) : loading ? (
                <p className="p-4 text-sm" role="status">
                  <span
                    className="material-symbols-outlined mr-2 animate-spin align-middle"
                    aria-hidden="true"
                  >
                    progress_activity
                  </span>
                  Searching admin records…
                </p>
              ) : error ? (
                <div className="p-4" role="alert">
                  <p>{error}</p>
                  {!/[Pp]ermission|[Tt]oo many/.test(error) ? (
                    <button
                      className="mt-2 font-bold text-primary"
                      onClick={() => void request(1, false)}
                    >
                      Retry search
                    </button>
                  ) : null}
                </div>
              ) : results.length === 0 ? (
                <p className="p-4 text-sm" role="status">
                  No admin records found for “{normalized}”.
                </p>
              ) : (
                <>
                  <div
                    className="px-3 pb-2 text-xs font-semibold text-secondary"
                    aria-live="polite"
                  >
                    {pagination?.total ?? results.length} results
                  </div>
                  <ul
                    id="admin-search-results"
                    role="listbox"
                    aria-label="Admin search results"
                  >
                    {results.map((result, index) => {
                      const meta = typeMeta(result.type);
                      const safe = isSafeAdminSearchRoute(result.route);
                      return (
                        <li
                          key={`${result.type}|${result.route}`}
                          id={`admin-search-option-${index}`}
                          role="option"
                          aria-selected={active === index}
                          className="border-t border-slate-100"
                        >
                          <button
                            type="button"
                            disabled={!safe}
                            title={result.title}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => select(result)}
                            className={`w-full p-3 text-left outline-none ${active === index ? "bg-slate-100 ring-2 ring-inset ring-primary" : "hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="material-symbols-outlined mt-0.5"
                                aria-hidden="true"
                              >
                                {meta.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="max-w-full truncate">
                                    {result.title}
                                  </strong>
                                  <span className="text-xs font-semibold">
                                    {meta.label}
                                  </span>
                                  {result.status ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                                      {statusLabel(result.status)}
                                    </span>
                                  ) : null}
                                </div>
                                {result.subtitle ? (
                                  <p
                                    className="truncate text-sm text-secondary"
                                    title={result.subtitle}
                                  >
                                    {result.subtitle}
                                  </p>
                                ) : null}
                                {result.reference ? (
                                  <p className="truncate font-mono text-xs text-secondary">
                                    {result.reference}
                                  </p>
                                ) : null}
                                <p className="truncate text-xs text-secondary">
                                  Matched{" "}
                                  {matchedFieldLabel(result.matchedField)}:{" "}
                                  {result.matchedText}
                                </p>
                                <p className="text-xs text-secondary">
                                  {dateTime(result.updatedAt)}
                                </p>
                                {!safe ? (
                                  <p className="text-xs font-semibold">
                                    Destination unavailable
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {pagination && pagination.page < pagination.pages ? (
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void request(pagination.page + 1, true)}
                      className="mt-2 w-full rounded-lg p-3 font-bold text-primary hover:bg-slate-50 disabled:opacity-60"
                    >
                      {loadingMore ? "Loading more…" : "Load more results"}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
export default AdminGlobalSearch;
