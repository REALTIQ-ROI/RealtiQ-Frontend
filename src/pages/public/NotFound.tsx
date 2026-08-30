import { Link, useLocation } from "react-router-dom";
import PublicLayout from "../../components/layout/PublicLayout";
import { useAuth } from "../../contexts/AuthContext";

const dashboardPath = (role?: string) =>
  role === "admin"
    ? "/dashboard/admin"
    : role === "landlord"
      ? "/dashboard/landlord"
      : role === "proxy_inspector"
        ? "/proxy/tasks"
        : "/dashboard/buyer";
const NotFound = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  return (
    <PublicLayout>
      <section
        className={
          "mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 text-center sm:px-8"
        }
      >
        <div
          className={
            "w-full rounded-3xl border border-outline-variant/15 bg-white p-8 shadow-sm sm:p-12"
          }
        >
          <p
            className={
              "text-sm font-black uppercase tracking-[0.25em] text-secondary"
            }
          >
            404
          </p>
          <h1 className={"mt-3 text-4xl font-black sm:text-5xl"}>
            We could not find that page
          </h1>
          <p className={"mx-auto mt-4 max-w-xl text-secondary"}>
            The address may be incorrect, or the page may have moved. You can
            continue browsing RealtIQ from one of the links below.
          </p>
          <p className={"mt-3 break-all text-xs text-secondary"}>
            Requested page: {location.pathname}
          </p>
          <div
            className={"mt-8 flex flex-col justify-center gap-3 sm:flex-row"}
          >
            <Link
              to={"/"}
              className={
                "rounded-xl bg-primary px-6 py-3 font-bold text-on-primary"
              }
            >
              Return home
            </Link>
            <Link
              to={"/properties"}
              className={
                "rounded-xl bg-surface-container-low px-6 py-3 font-bold text-primary"
              }
            >
              Browse properties
            </Link>
            {isAuthenticated ? (
              <Link
                to={dashboardPath(user?.role)}
                className={
                  "rounded-xl border border-primary/20 px-6 py-3 font-bold text-primary"
                }
              >
                Go to dashboard
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
export default NotFound;
