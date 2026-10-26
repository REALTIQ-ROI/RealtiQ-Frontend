import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BuyerPortalLayout from "../../../components/layout/BuyerPortalLayout";
import MediaPreview from "../../../components/property/MediaPreview";
import MapListLayout from "../../../components/property/map/MapListLayout";
import OwnershipReviewForm from "../../../components/reviews/OwnershipReviewForm";
import ErrorState from "../../../components/ui/ErrorState";
import LoadingState from "../../../components/ui/LoadingState";
import { useAsync } from "../../../hooks/useAsync";
import {
  isReviewEligible,
  isConfirmedOwnership,
  ownershipService,
} from "../../../services/ownershipService";
import { propertyRouteReference, type Property } from "../../../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

const MyProperties = () => {
  const { data: ownerships, loading, error, execute: refreshOwnerships } = useAsync(
    () => ownershipService.getMyOwnerships(),
    true,
  );
  const confirmedOwnerships = useMemo(
    () => (ownerships ?? []).filter(isConfirmedOwnership),
    [ownerships],
  );
  const otherOwnerships = useMemo(
    () => (ownerships ?? []).filter((ownership) => !isConfirmedOwnership(ownership)),
    [ownerships],
  );
  const ownedProperties = useMemo(
    () =>
      confirmedOwnerships
        .map((item) => item.property ?? item.propertyId)
        .filter(
          (property): property is Property =>
            typeof property === "object" && property !== null,
        ),
    [confirmedOwnerships],
  );
  const reviewCandidates = useMemo(
    () => (ownerships ?? []).filter(isReviewEligible),
    [ownerships],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    "all" | "residential" | "commercial"
  >("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const myProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (ownedProperties ?? []).filter((item) => {
      const matchesQuery =
        !needle ||
        `${item.title} ${item.location} ${item.propertyType}`
          .toLowerCase()
          .includes(needle);
      const matchesCategory =
        category === "all" ||
        (category === "commercial"
          ? item.propertyType === "commercial"
          : item.propertyType !== "commercial");
      return matchesQuery && matchesCategory;
    });
  }, [category, ownedProperties, query]);

  const topbarSearch = (
    <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/20">
      <span className="material-symbols-outlined text-sm mr-2">search</span>
      <input
        className="bg-transparent border-none focus:ring-0 text-sm w-48 font-medium"
        placeholder="Search portfolio..."
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <BuyerPortalLayout
      pageEyebrow="Portfolio Overview"
      pageTitle="My Properties"
      pageSubtitle="View the properties currently tied to your account and compare their value."
      topbarRight={topbarSearch}
    >
      <section className="mb-12">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4">
            {[
              { key: "all", label: `All Assets (${myProperties.length})` },
              { key: "residential", label: "Residential" },
              { key: "commercial", label: "Commercial" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setCategory(item.key as typeof category);
                  setPage(1);
                }}
                className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${
                  category === item.key
                    ? "bg-secondary-fixed text-on-secondary-fixed"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
            to="/properties"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Browse Properties
          </Link>
        </div>
      </section>

      {loading ? <LoadingState label="Loading server-confirmed ownership records..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void refreshOwnerships()} /> : null}

      {!loading && !error && otherOwnerships.length ? (
        <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="ownership-status-title">
          <h2 id="ownership-status-title" className="text-xl font-black">Purchase and allocation records</h2>
          <p className="mt-1 text-sm text-secondary">These records have not been returned with the server status “owned”, so they are not included in your confirmed property portfolio.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {otherOwnerships.map((ownership, index) => {
              const associatedProperty = ownership.property ?? ownership.propertyId;
              const property = typeof associatedProperty === "object" && associatedProperty !== null ? associatedProperty : null;
              const propertyLabel = property?.title ?? (typeof associatedProperty === "string" ? associatedProperty : "Property details unavailable");
              const propertyRoute = property ? propertyRouteReference(property) : undefined;
              const recordId = ownership._id ?? ownership.id ?? `ownership-${index}`;
              return (
                <article key={recordId} className="rounded-xl bg-white p-4">
                  <h3 className="font-bold">{propertyLabel}</h3>
                  <p className="mt-2 text-sm text-secondary">Ownership status: {ownership.status || "Not returned"}</p>
                  {ownership.payment?.status ? <p className="text-sm text-secondary">Payment status: {ownership.payment.status}</p> : null}
                  {ownership.escrow?.status ? <p className="text-sm text-secondary">Escrow status: {ownership.escrow.status}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
                    {propertyRoute ? <Link className="underline" to={`/dashboard/buyer/property-details/${propertyRoute}`}>Open property record</Link> : null}
                    {ownership.payment?._id ? <Link className="underline" to={`/dashboard/buyer/payment-details/${encodeURIComponent(ownership.payment._id)}`}>Open payment record</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {reviewCandidates.length ? (
        <section
          className={"mb-10 rounded-2xl bg-surface-container-low p-5"}
          aria-labelledby={"purchase-reviews-title"}
        >
          <h2 id={"purchase-reviews-title"} className={"text-xl font-black"}>
            Review completed purchases
          </h2>
          <p className={"mt-1 text-sm text-secondary"}>
            Only eligible paid and fulfilled property purchases appear here.
            Seller and transaction details come from your ownership record.
          </p>
          <div className={"mt-4 grid gap-4 md:grid-cols-2"}>
            {reviewCandidates.map((ownership) => (
              <article
                key={ownership._id ?? ownership.payment?._id}
                className={"rounded-xl bg-surface-container-lowest p-4"}
              >
                <h3 className={"font-bold"}>
                  {typeof ownership.property === "object"
                    ? ownership.property.title
                    : "Purchased property"}
                </h3>
                <OwnershipReviewForm
                  ownership={ownership}
                  onSuccess={async () => {
                    await refreshOwnerships();
                  }}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error ? <MapListLayout
        properties={myProperties}
        detailsPath={(property) =>
          `/dashboard/buyer/property-details/${propertyRouteReference(property)}`
        }
      >
        {(visibleProperties) => {
          const paginated = visibleProperties.slice(
            (page - 1) * itemsPerPage,
            page * itemsPerPage,
          );
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {paginated.map((property) => (
                <div
                  key={property._id}
                  className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300"
                >
                  <div className="relative h-64 overflow-hidden">
                    <MediaPreview
                      media={property.media[0]}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase rounded-full">
                        Owned
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-primary tracking-tight">
                        {property.title}
                      </h3>
                      <p className="text-secondary text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          location_on
                        </span>
                        {property.location}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/10 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                          Current listing price
                        </span>
                        <span className="text-2xl font-black text-primary">
                          {formatCurrency(property.price)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-3 text-secondary">
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1 text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-sm">
                              bed
                            </span>{" "}
                            {property.bedrooms}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-sm">
                              bathtub
                            </span>{" "}
                            {property.bathrooms}
                          </span>
                        </div>
                        <Link
                          className="text-xs font-bold text-primary hover:underline"
                          to={`/dashboard/buyer/property-details/${propertyRouteReference(property)}`}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {visibleProperties.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
                  <span className="material-symbols-outlined text-6xl opacity-30 mb-4 block">
                    domain_disabled
                  </span>
                  <p className="font-bold text-primary">
                      {myProperties.length
                      ? "No properties in this map view"
                        : "No server-confirmed owned properties found"}
                  </p>
                  <p className="text-sm mt-1">
                    {myProperties.length
                      ? "Move or zoom the map to update the visible list."
                        : "Purchase and allocation records with other statuses remain listed above. Browse available listings to explore properties."}
                  </p>
                </div>
              ) : null}

              <Link
                className="group flex flex-col items-center justify-center bg-surface-container-low border-2 border-dashed border-outline-variant/40 rounded-xl p-8 hover:bg-surface-container-highest transition-all duration-300 cursor-pointer min-h-[400px]"
                to="/properties"
              >
                <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    add_business
                  </span>
                </div>
                <h3 className="text-lg font-bold text-primary tracking-tight">
                  Expand Portfolio
                </h3>
                <p className="text-secondary text-xs text-center mt-2 max-w-[180px]">
                  Browse our curated collection of off-market properties
                  worldwide.
                </p>
                <span className="mt-6 text-xs font-bold text-primary underline underline-offset-4 tracking-wider uppercase">
                  Explore New Listings
                </span>
              </Link>
            </div>
          );
        }}
      </MapListLayout> : null}

      <footer className="mt-20 flex flex-col md:flex-row items-center justify-between border-t border-outline-variant/20 pt-10">
        <div className="flex gap-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
              Confirmed ownership records
            </span>
            <span className="text-xl font-bold text-primary tracking-tight">
              {confirmedOwnerships.length} confirmed ownership record{confirmedOwnerships.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
              Properties in current view
            </span>
            <span className="text-xl font-bold text-primary tracking-tight">
              {myProperties.length}
            </span>
          </div>
        </div>
      </footer>
    </BuyerPortalLayout>
  );
};

export default MyProperties;
