# Group 08 — Search and Discovery API

This is the backend contract for PRD §6 and the cited RQS-03 search requirements. The canonical listing dictionary, current mounted route handlers, and `canonicalCatalogueService` are the implementation sources. The Specifications control where they refine or conflict with the PRD.

The public catalogue, property map, nearby search, project grouping/map, project-scoped public units, facets, counts, saved-search matching, and canonical alert matching share the same effective-unit predicate. Public search never makes a draft, unpublished, unresolved, archived, quarantined, or `Not released` record visible.

## Shared request rules

- Public catalogue and map reads use optional Bearer authentication. Anonymous access is supported. If a Bearer token is sent, it must be current; invalid credentials are not treated as anonymous.
- A user’s authenticated profile context is selected by the current auth middleware and `X-Profile-ID`; profile-specific operations must send the selected profile. Saved searches require a registered account/profile and server-side `personalisation.read` or `personalisation.manage` authorization.
- Canonical search uses `queryVersion=canonical-v1`. Responses use the shared safe error envelope `{ "message": "…", "code": "…" }` with the request ID in `X-Request-ID`.
- Canonical page is 1–10,000; limit is 1–100. Map detail responses additionally cap the page size at `MAP_MAX_PROPERTIES_PER_REQUEST`. Nearby uses the same canonical page bounds. Project map returns at most the configured map limit and states whether it is truncated.
- Default values are `sort=recommended`, `status=available`, `includeUnpriced=true`, `withPhotosOnly=true`, `includeUnderOffer=false`, and `includeSold=false`. `status=all` does not itself include under-offer or sold records; those require their respective include flags. `Not released` is never public.
- Exact-reference lookup (`reference` or `exactReference`) pauses all user filters, map bounds, and requested sort; it uses `newest`, page 1, limit 1 and still applies current public eligibility and deduplication.
- Multi-select values within an ordinary attribute use OR. Different attributes are ANDed. Selected amenities are strict AND. Keyword tokens are strict AND and combine with all other criteria. Every criterion applies to the same effective property/unit values; a project group appears only when at least one published, eligible unit matches.
- The URL/query is the persisted search state. `normalization.query` returns the effective canonical state after aliases, defaults, location ancestry, and source-defined dependent-filter clearing. `normalization.notices` explains safe normalization; clients should store the returned query rather than silently reconstructing server defaults.
- An authenticated profile’s `fromAccountsIFollow=true` criterion is never silently dropped. It requires the current registered profile and its follow scope.
- Sensitive internal profile completeness values, ranking weights, Sponsored placement IDs, FX provider details, private documents, and private coordinates are not returned.

## Mounted frontend-facing endpoints

| Method and path | Access | Purpose and success shape |
|---|---|---|
| `GET /api/properties` | Public; optional Bearer | Canonical catalogue. `{ properties, total, page, limit, sort, facets, notices, query, normalization, diagnostics? }`. Each property is the existing public property DTO plus `canonicalEffectiveFields`; current eligible Sponsored rows may add `sponsorship:{label:"Sponsored"}`. |
| `GET /api/properties/map` | Public; optional Bearer | Same canonical predicate. Detail mode returns the page as point properties. Cluster mode returns clusters instead of individual properties. Shared total, facets, sort, pagination and normalization are retained. |
| `GET /api/properties/map/nearby` | Public; optional Bearer | Canonical nearby search. Accepts `lat`, `lng`, `radiusKm` (legacy `radius`) and canonical aliases `nearbyLat`, `nearbyLng`, `nearbyRadiusKm`; aliases must agree. Returns `{ center:[lng,lat], radiusKm, properties, total, page, limit, sort, facets, notices, normalization, diagnostics? }`. Default photo and availability behavior matches `/api/properties`. |
| `GET /api/projects` | Public; optional Bearer | The same matching units grouped by project. `{ projects, total, page, limit, sort, facets, diagnostics?, normalization }`; `total` counts matching project groups. Each card’s `matchingUnits` is a bounded preview of matching units only. |
| `GET /api/projects/map` | Public; optional Bearer | The same criteria grouped as project markers. `{ mode:"projects", bounds, total, limit, truncated, projects, facets, diagnostics?, normalization }`. It does not return property clusters or a cluster-expansion token. Each marker is the safe public project card plus coordinates and matching-unit aggregates. |
| `GET /api/projects/:idOrSlug/properties` | Public; optional Bearer | Project-scoped canonical unit results; the project scope is ANDed with all search conditions. `{ project, properties, total, page, limit, sort, facets, normalization }`. `includeUnpublished=true` is a separate authenticated seller-management flow, not public discovery. |
| `GET /api/properties/field-dictionary` | Public | Existing public canonical listing dictionary. Use its source-defined filterable keys and allowed values; it is the vocabulary source, not a second search endpoint. |
| `GET /api/locations/gazetteer/status` | Public | `{ state, revision, errorCode, activeDataset }` when a revision exists; otherwise `{ state:"unconfigured", revision:0, activeDataset:null }`. No secret configuration is exposed. |
| `GET /api/locations/suggestions` | Public; rate limited | Authoritative typeahead. Parameters and response are defined below. |
| `GET /api/locations/:id` | Public | Resolve an active approved location ID to `{ location:{ id, level, name, parentId, breadcrumbs, publishedStockCount, revision } }`; only locations with eligible stock resolve. |
| `GET /api/personalisation/searches` | Bearer + registered profile + `personalisation.read` | `{ savedSearches:[SavedSearchDTO], pagination:{page,limit,total,pages} }`. Query accepts only `page` and `limit`. Private/no-store. |
| `POST /api/personalisation/searches` | Bearer + registered profile + `personalisation.manage` | HTTP 201 `{ savedSearch: SavedSearchDTO }`. |
| `GET /api/personalisation/searches/:id` | Bearer + registered profile + `personalisation.read` | `{ savedSearch: SavedSearchDTO }`; ID may be the database ID or public reference. Private/no-store. |
| `PATCH /api/personalisation/searches/:id` | Bearer + registered profile + `personalisation.manage` | `{ savedSearch: SavedSearchDTO }`; optional optimistic `expectedConfigurationRevision`. Private/no-store. |
| `DELETE /api/personalisation/searches/:id` | Bearer + registered profile + `personalisation.manage` | `{ deleted:true }`. Private/no-store. |

Saved-search alert matching is performed by the existing background worker, not by a request endpoint. It detects eligible new listings and persisted asking-price reductions, rechecks the current account/profile/permissions before notification, and uses durable pending batches and persisted cursors. Frontend polling does not trigger a match or advance a cursor.

### Public field dictionary response

`GET /api/properties/field-dictionary` returns the source dictionary plus runtime-safe capability state. Its top-level fields are `version`, `categories`, `propertyTypes`, `buildStages`, `milestonePhases`, `milestones`, `amenityGroups`, `amenities`, `architecturalStyles`, `titleDeclarations`, `titleDocumentTypes`, `developmentStructures`, `advertiserTypes`, `unitDisplayModes`, `accessLevels`, `roadConditions`, `servicedValues`, `furnishingValues`, `occupancyValues`, `paymentOptionValues`, `availabilityValues`, `currencyValues`, `fitOutValues`, `fields`, and `configuration`. Each field in `fields` has public canonical metadata including its `key`, display label, type, allowed values where defined, applicability, validation/requiredness, `searchable`, and visibility/editability metadata; use the returned structure rather than a locally recreated enum. Search-relevant `configuration` includes `mortgage.state`, `location` provider/dataset/boundary state and safe location policies, `fx` rate state and supported currencies, and `poa` presentation policy. The DTO does not expose ranking weights, Sponsored record IDs, provider credentials, or private profile signals.

The location status response is either `{ "state":"unconfigured", "revision":0, "activeDataset":null }` or `{ "state":"configured"|"unavailable", "revision":<integer>, "errorCode":<string|null>, "activeDataset":{ "sourceKind":<string>, "rowCount":<integer>, "digest":<sha256>, "approvedAt":<ISO timestamp|null> } }`. This is operational status only; it is not a replacement for suggestions or an authorization to invent location IDs.

## Canonical query parameter contract

### Common fields and geographic bounds

| Parameter | Type and accepted values | Behavior |
|---|---|---|
| `queryVersion` | `canonical-v1` | Version marker. Other values: `400 CONTENT_QUERY_VERSION_UNSUPPORTED`. |
| `page`, `limit` | Integers, page 1–10,000; limit 1–100 | Pagination. The project map uses the map policy limit. |
| `sort` | One of the 12 keys below; default `recommended` | Unsupported values return `400 CONTENT_QUERY_SORT_INVALID`. |
| `status` | `available` (default), `all`, `under_offer`, `sold` | Availability scope; current publication/eligibility still applies. |
| `includeUnderOffer`, `includeSold` | `true|false`, both default `false` | Cumulative inclusions when `status=available` or `all`. |
| `includeUnpriced` | `true|false`, default `true` | POA/unpriced presentation is controlled separately from price comparison by the approved POA policy. POA is never converted to zero. |
| `withPhotosOnly` | `true|false`, default `true` | Requires released, eligible image media. |
| `search` | Up to 10 terms, each at most 64 characters | All terms must match the same searchable public title/description/project text. |
| `reference`, `exactReference` | One public reference, max 80 chars, `[A-Za-z0-9-]+` | Exact lookup; both aliases supplied with different values return `400 CONTENT_QUERY_ALIAS_CONFLICT`. |
| `projectId`, `projectSlug` | Object ID or slug | Optional project scope; project map/grouping also enforces one matching-unit predicate. |
| `north`, `south`, `east`, `west` | Numeric latitude/longitude bounds | All four required when active; valid Nigeria/world numeric bounds are enforced, and maximum area is policy bounded. |
| `mapActive` / `search_as_i_move_the_map` | `true|false` | Omitted: bounds activate when supplied. `false` means bounds do not narrow the catalogue; a property map returns only the current bounded result page as markers. `true` requires all four bounds. |
| `mapZoom`, `zoom` | Integer/number 0–22 | Must agree if both are supplied. `/api/properties/map` and `/api/projects/map` default map zoom to 10. |
| `nearbyLat`, `nearbyLng`, `nearbyRadiusKm` | Latitude, longitude, positive kilometres | Must be supplied together and not exceed `SEARCH_NEARBY_MAX_RADIUS_KM`; alternatively use the nearby endpoint’s `lat`, `lng`, `radiusKm` aliases. |
| `commuteFrom` | `<longitude>,<latitude>` | Requires `commuteMinutes`; origin is removed from echoed normalized metadata. |
| `commuteMinutes` | `15|30|45|60` | Current authoritative route-time comparison; provider unavailable is a 503, never a straight-line approximation. |

The map route clusters when zoom is below `MAP_PROPERTY_DETAIL_MIN_ZOOM`; detail zoom returns property markers. Coarse/medium/fine grid precision and viewport area are policy controlled. Without active bounds, marker mode is page-limited and has `bounds:null`; it is not a request to enumerate every catalogue pin.

### Source filter/control atoms — all 66

Each row records a per-atom backend status: `IMPLEMENTED`; `IMPLEMENTED — CONFIGURATION-GATED` where an authoritative provider, dataset, or approved policy activates the behavior; `IMPLEMENTED — SOURCE-DISABLED` where the launch source explicitly keeps a choice unavailable; or `PARTIAL — SOURCE DECISION` where source wording is ambiguous. The frontend column is `NOT ASSESSED` because this task changes only the backend repository; the exact integration contract is provided in `docs/frontend_contract_08.md`.

| ID | Source atom | Exact canonical request key(s) | Backend behavior/status | Frontend status |
|---|---|---|---|---|
| F01 | State | `state` | IMPLEMENTED — CONFIGURATION-GATED — Stable gazetteer ID; readable names resolve only through approved directory. GATED by location source. | NOT ASSESSED; contract supplied |
| F02 | LGA | `lga` | IMPLEMENTED — CONFIGURATION-GATED — Stable ID and state ancestry; parent absorbs selected child. GATED by directory. | NOT ASSESSED; contract supplied |
| F03 | Area | `area` | IMPLEMENTED — CONFIGURATION-GATED — Stable ID and LGA ancestry. GATED by directory. | NOT ASSESSED; contract supplied |
| F04 | Gated Estate | `gatedEstate`, `estateName` | IMPLEMENTED — CONFIGURATION-GATED — Boolean plus stable estate ID/name; estate names resolve in approved hierarchy. GATED. | NOT ASSESSED; contract supplied |
| F05 | Location suggestions / nearby maximum | `/api/locations/suggestions`; nearby coordinates/radius | IMPLEMENTED — CONFIGURATION-GATED — Typeahead is authoritative; nearby requires approved maximum. GATED. | NOT ASSESSED; contract supplied |
| F06 | Map viewport | `north`, `south`, `east`, `west`, `mapActive`, `mapZoom` (`zoom`) | IMPLEMENTED — Bounds are ANDed when active; bounded by configured area. | NOT ASSESSED; contract supplied |
| F07 | Commute 15/30/45/60 | `commuteFrom`, `commuteMinutes` | IMPLEMENTED — CONFIGURATION-GATED — Uses provider route matrix only; no straight-line fallback. GATED. | NOT ASSESSED; contract supplied |
| F08 | Minimum price | `minPrice` / `min_price` | IMPLEMENTED — CONFIGURATION-GATED — NGN comparison; USD requires approved current evidence FX. | NOT ASSESSED; contract supplied |
| F09 | Maximum price | `maxPrice` / `max_price` | IMPLEMENTED — CONFIGURATION-GATED — Same FX and POA rules as F08. | NOT ASSESSED; contract supplied |
| F10 | Under ₦25M | `priceBand=under_25m` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; USD inclusion needs approved FX. | NOT ASSESSED; contract supplied |
| F11 | ₦25M–₦50M | `priceBand=25m_50m` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F12 | ₦50M–₦100M | `priceBand=50m_100m` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F13 | ₦100M–₦250M | `priceBand=100m_250m` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F14 | ₦250M–₦500M | `priceBand=250m_500m` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F15 | ₦500M–₦1B | `priceBand=500m_1b` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F16 | Over ₦1B | `priceBand=over_1b` | IMPLEMENTED — CONFIGURATION-GATED — NGN band; same FX gate. | NOT ASSESSED; contract supplied |
| F17 | Price reduced since original listing | `reducedSinceListing=true` / `price_reduced=true` | IMPLEMENTED — Requires valid persisted initial/latest/decrease asking-price history; no inference from edit. | NOT ASSESSED; contract supplied |
| F18 | Negotiable | `negotiable=true` / `price_negotiable=true` | IMPLEMENTED — Effective canonical boolean. | NOT ASSESSED; contract supplied |
| F19 | Service charge Any/None | `serviceCharge=any / none` | IMPLEMENTED — `none` matches explicit source None only; missing is unknown. | NOT ASSESSED; contract supplied |
| F20 | Service-charge caps | `serviceCharge=up_to_500k / up_to_1m / up_to_2.5m / up_to_5m` | IMPLEMENTED — annual NGN cap; unknown and explicit None do not match a numeric cap. | NOT ASSESSED; contract supplied |
| F21 | Include unpriced / POA | `includeUnpriced=true / false` | IMPLEMENTED — default true; bounded-price and sort behavior follows centralized POA policy with safe defaults. | NOT ASSESSED; contract supplied |
| F22 | Outright / Instalment | `paymentOptions` / `payment_type`: `outright_purchase`, `instalment_plan` | IMPLEMENTED — source options use OR within the selected choices; Mortgage Accepted remains disabled by the launch source. | NOT ASSESSED; contract supplied |
| F23 | Instalment duration | `instalmentDuration` / `installmentDuration`: `any / 6+ / 12+ / 24+ / 36+` | IMPLEMENTED — requires Instalment Plan; selecting only Outright clears it with a normalization notice. | NOT ASSESSED; contract supplied |
| F24 | Initial-deposit cap | `initialDepositCap=any / 10 / 20 / 30 / 50` | IMPLEMENTED — percent upper bound, dependent on Instalment Plan. | NOT ASSESSED; contract supplied |
| F25 | Escrow available | `escrowAvailable=true / false` | IMPLEMENTED — `true` requires escrow for a selected payment option; `false` clears this positive filter. | NOT ASSESSED; contract supplied |
| F26 | Mortgage Accepted | `paymentOptions=mortgage_accepted` | IMPLEMENTED — SOURCE-DISABLED — Dictionary advertises mortgage state disabled and the parser rejects the option; do not display it as currently selectable. | NOT ASSESSED; contract supplied |
| F27 | Eight build stages | `buildStage` / `completionStage` / `stages` | IMPLEMENTED — Source stages; multi-select OR. | NOT ASSESSED; contract supplied |
| F28 | Ready to Move In | `readyToMoveIn=true` | IMPLEMENTED — Restricts to newly built, renovated, previously owned; clears milestone/from/by controls. | NOT ASSESSED; contract supplied |
| F29 | Construction milestone | `constructionMilestone` / `milestone` | IMPLEMENTED — Uses these 15 canonical values with OR matching: Site Clearing & Excavation, Foundation Footing, DPC (German Floor), Blockwork / Lintel Level, Decking, Roofing / Parapet, Lock-up, First-Fix Infrastructure, POP Ceiling, Tiling & Floor Finishes, Second-Fix Installation, Screeding & Painting, External Works & Services, Snagging & Inspection, and Handover. `GET /api/properties/field-dictionary` is authoritative for keys and labels. | NOT ASSESSED; contract supplied |
| F30 | Handover From / By | `handoverFrom`, `handoverBy` (`YYYY-MM`) | IMPLEMENTED — From defaults to current Nigeria month when By-only is sent; From cannot predate current month; By must be ≥ From; scheduled construction stock only. | NOT ASSESSED; contract supplied |
| F31 | Bedrooms | `bedrooms`, `minBedrooms`, `maxBedrooms`, `exactBedrooms`, `min_beds`, `max_beds`, `exact_beds` | IMPLEMENTED — Effective unit; exact `6+` is ≥6. | NOT ASSESSED; contract supplied |
| F32 | Full bathrooms | `fullBathrooms`, `bathrooms`, min/max/exact fullBathrooms | IMPLEMENTED — Commercial null room counts remain eligible when no explicit count exists. | NOT ASSESSED; contract supplied |
| F33 | Dedicated powder rooms/toilets | `powderRooms`, `toilets`, min/max/exact powderRooms | IMPLEMENTED — Uses explicit dedicated toilet count, not full bathrooms. | NOT ASSESSED; contract supplied |
| F34 | All en-suite | `allBedroomsEnSuite` | IMPLEMENTED — effective true/false value. | NOT ASSESSED; contract supplied |
| F35 | Internal floor area | `internalFloorArea`, `minInternalFloorArea`, `maxInternalFloorArea` | IMPLEMENTED — Square metres only. | NOT ASSESSED; contract supplied |
| F36 | Unit footprint/built-up area | `unitFootprint`, `minBuiltUpArea`, `maxBuiltUpArea` | IMPLEMENTED — Square metres only. | NOT ASSESSED; contract supplied |
| F37 | Plot/shared site size | `plotSize`, `minPlotArea`, `maxPlotArea` | IMPLEMENTED — Square metres; shared physical site value where applicable. | NOT ASSESSED; contract supplied |
| F38 | Number of floors | `numberOfFloors=2 / 3 / 4+` | IMPLEMENTED — Restricts to Terraced House/Townhouse; 4+ means minimum 4. | NOT ASSESSED; contract supplied |
| F39 | Furnishing | `furnishing` | IMPLEMENTED — Source enum, OR among selected values. | NOT ASSESSED; contract supplied |
| F40 | Serviced | `servicedStatus` | IMPLEMENTED — Source enum value. | NOT ASSESSED; contract supplied |
| F41 | Parking | `parkingSpaces` | IMPLEMENTED — Effective numeric/categorical canonical value as defined by its field type. | NOT ASSESSED; contract supplied |
| F42 | Access road | `accessRoadConditions` | IMPLEMENTED — Source multi-enum; OR within road choices. | NOT ASSESSED; contract supplied |
| F43 | Occupancy / Sold with occupiers | `occupancy` | IMPLEMENTED — Sold-with-occupiers only matches a current completed-sale state; seller text cannot mark a listing sold. | NOT ASSESSED; contract supplied |
| F44 | Architectural style | `architecturalStyle` | IMPLEMENTED — Source style catalogue; OR within choices. | NOT ASSESSED; contract supplied |
| F45 | Amenities | `unitFeatures` / `amenities` | IMPLEMENTED — Strict AND; includes effective project facilities plus unit amenities. | NOT ASSESSED; contract supplied |
| F46 | Declared title | `titleDeclarations` / `rootTitleDeclarations` / `title` | IMPLEMENTED — Source title declarations; declaration does not equal verification. | NOT ASSESSED; contract supplied |
| F47 | Platform-Verified Title | `platformVerifiedTitleOnly=true` | IMPLEMENTED — CONFIGURATION-GATED — Current document/version-backed title verification only. | NOT ASSESSED; contract supplied |
| F48 | Platform-Verified Listing | `platformVerifiedListingOnly=true` | IMPLEMENTED — CONFIGURATION-GATED — Current approved listing-verification evidence only. | NOT ASSESSED; contract supplied |
| F49 | Listed By | `advertiserType` | IMPLEMENTED — Current profile-derived Owner/Agent/Developer provenance, not caller-supplied flags. | NOT ASSESSED; contract supplied |
| F50 | From accounts I follow | `fromAccountsIFollow=true` | IMPLEMENTED — Current registered profile follow scope; never silently broadens. | NOT ASSESSED; contract supplied |
| F51 | Added to Site / recency | `publishedWithin=anytime / 24h / 3d / 7d / 14d / 30d` | IMPLEMENTED — Uses original publication time, not later edits. | NOT ASSESSED; contract supplied |
| F52 | Availability | `status=available, all, under_offer, sold`, plus include flags | IMPLEMENTED — defaults Available Only; Under Offer/Sold are independently included. | NOT ASSESSED; contract supplied |
| F53 | With Photos Only | `withPhotosOnly=true / false` | IMPLEMENTED — Default true; released image media. | NOT ASSESSED; contract supplied |
| F54 | Live/Recorded video | `videoTour=live, recorded, or live,recorded`; `hasVideoTour` | IMPLEMENTED — typed current live/recorded media or capability. | NOT ASSESSED; contract supplied |
| F55 | 3D/virtual tour | `has3dTour=true` | IMPLEMENTED — Approved Matterport, Realsee or CloudPano reference only. | NOT ASSESSED; contract supplied |
| F56 | Floor plan | `hasFloorPlan=true` | IMPLEMENTED — Released typed public floor-plan media. | NOT ASSESSED; contract supplied |
| F57 | Drone/fly-through | `hasDroneFlyThrough=true` | IMPLEMENTED — Released typed drone media. | NOT ASSESSED; contract supplied |
| F58 | Open House | `openHouse=true` | IMPLEMENTED — Current schedule and applicable timezone. | NOT ASSESSED; contract supplied |
| F59 | Open House this weekend | `openHouseThisWeekend=true` | IMPLEMENTED — Current schedule; weekend evaluated in its configured timezone. | NOT ASSESSED; contract supplied |
| F60 | Private showings by appointment | `privateShowingsByAppointment=true` | IMPLEMENTED — Effective project viewing value. | NOT ASSESSED; contract supplied |
| F61 | Show Home | `hasShowHome=true` | IMPLEMENTED — Effective unit-type/project show-home data. | NOT ASSESSED; contract supplied |
| F62 | Distress Sale | `distressSaleOnly=true` | IMPLEMENTED — Requires current admin-reviewed evidence; never seller assertion alone. | NOT ASSESSED; contract supplied |
| F63 | Keywords | `search` | IMPLEMENTED — Up to 10 terms, 64 characters each; strict AND. | NOT ASSESSED; contract supplied |
| F64 | Exact public reference | `reference` / `exactReference` | IMPLEMENTED — Pauses other criteria and sort; remains public-eligibility scoped. | NOT ASSESSED; contract supplied |
| F65 | Sort/defaults/URL restoration | `sort`, `page`, `limit`, normalized query | IMPLEMENTED — Defaults are explicit in response; frontend Clear All restores them. Source `sort` parameters are in the 12-sort table. | NOT ASSESSED; contract supplied |
| F66 | Display currency / Featured | No query parameter | IMPLEMENTED — NO FILTER BY SOURCE — Display currency never changes membership; Featured is editorial and is not a buyer filter, sort, or ranking input. | NOT ASSESSED; contract supplied |

### Aliases and field-based controls

The parser accepts canonical searchable source-field keys and `minX`/`maxX`/`exactX` only for searchable numeric fields. Known URL aliases include `type`, `beds`, `toilets`, `title`, `payment_type`, `price_negotiable`, `price_reduced`, `search_as_i_move_the_map`, `min_price`, `max_price`, `min_internal_floor_area`, `max_internal_floor_area`, `min_built_up_area`, `max_built_up_area`, `min_plot_area`, and `max_plot_area`. Conflicting duplicate canonical/alias values return `400 CONTENT_QUERY_ALIAS_CONFLICT`. Unsupported, private, removed, or non-source query keys return a 400 error rather than being silently interpreted as a canonical filter.

`currency` is not a filter: listing currency remains NGN or USD and buyer display-currency preference does not change catalogue membership. `featured` is not a filter or sort. Both parameters are rejected with `400 CONTENT_QUERY_REMOVED_FILTER`.

## The 12 supported sorts

Each sort below is implemented in the shared catalogue pipeline. Where a required policy or comparable signal is absent, the behavior is the safe fallback or gate stated in the row. Frontend implementation was not assessed in this backend-only task; the contract is supplied.

| UI/source sort | Canonical value | Runtime ordering and fallback | Backend status | Frontend status |
|---|---|---|---|---|
| Recommended (default) | `recommended` | Approved weights combine current verified listing, released media richness, current freshness, approved public profile-completeness and eligible Sponsored placement. If weights or a positive-weight authoritative signal are unavailable, all partial scores are discarded and results use deterministic newest-first ordering. No recommendation-unavailable code or score is returned. | IMPLEMENTED; policy/signal fallback | NOT ASSESSED; contract supplied |
| Newest / Most Recent | `newest` (`newest_most_recent`, `recent`) | Original publication time, then stable property ID. For legacy rows without `publishedAt`, stable creation time is used for ordering; recency filters still require publication time. | IMPLEMENTED | NOT ASSESSED; contract supplied |
| Price Low to High | `price_asc` (`price_low_to_high`) | NGN-comparable price; POA/unpriced last under approved policy. USD comparison requires an approved current rate. | IMPLEMENTED; FX/POA gated | NOT ASSESSED; contract supplied |
| Price High to Low | `price_desc` (`price_high_to_low`) | Same FX/POA policy. | IMPLEMENTED; FX/POA gated | NOT ASSESSED; contract supplied |
| Handover Date Soonest | `handover_soonest` (`handover_date_soonest`) | Only scheduled construction stock; ready/existing stock sorts after dated scheduled stock. | IMPLEMENTED | NOT ASSESSED; contract supplied |
| Verified First | `verified_first` | Current verified listing first, then Recommended when available, otherwise newest-first tie fallback. An approved listing-verification policy is required. | IMPLEMENTED; verification policy gated | NOT ASSESSED; contract supplied |
| Recently Reduced | `recently_reduced` | Latest valid persisted asking-price reduction first; never-reduced or unverifiable history last. | IMPLEMENTED | NOT ASSESSED; contract supplied |
| Price Reduced — Largest Drop | `largest_reduction` (`price_reduced_largest_drop`) | Defaults to verified percentage decrease from initial to current asking price. `PROPERTY_PRICE_REDUCTION_SORT_MODE=absolute` selects verified absolute decrease in NGN-comparable value. USD amounts use the current approved NGN-per-USD rate; no nominal USD/NGN comparison is made. | IMPLEMENTED — percentage default; absolute mode requires approved FX for USD candidates | NOT ASSESSED; contract supplied |
| Bedrooms Most | `bedrooms_desc` (`bedrooms_most`, `bedrooms`) | Effective value on the matching unit; missing values last. | IMPLEMENTED | NOT ASSESSED; contract supplied |
| Floor Area Largest | `floor_area_desc` (`floor_area_largest`, `floor_area`) | Effective internal floor area in sqm; missing values last. | IMPLEMENTED | NOT ASSESSED; contract supplied |
| Highest Rated | `highest_rated` | At least two qualifying reviews; average, then review count, then Recommended if available, then newest/ID. A listing without the minimum reviews is unrated and last. | IMPLEMENTED; review data eligibility enforced | NOT ASSESSED; contract supplied |
| Trust Tier | `trust_tier` | Current approved Platinum, Gold, Silver, Bronze, New order; score, Recommended tie when available, then newest/ID. If `trust_tier_thresholds` is unconfigured, returns `503 FEATURE_SEARCH_TRUST_TIER_POLICY_UNCONFIGURED`. | IMPLEMENTED — CONFIGURATION-GATED | NOT ASSESSED; contract supplied |

All ties finish with a stable ID ordering. Recommended never uses Featured status. Paid Sponsored eligibility is calculated from current server-side placement, advertiser and listing eligibility; the client cannot supply a Sponsored flag.

## Geographic discovery

### Location typeahead

`GET /api/locations/suggestions?level=state&q=lag&limit=10`

For `state`, `lga`, `area`, or `estate`, `q` is required (2–80 characters), `limit` is 1–20 (default 10), and LGA/Area/Estate require a current `parentId` of the immediately preceding source level. City is not a listing-search filter level; requests for `level=city` return `422 CONTENT_LOCATION_QUERY_INVALID`. A response is:

```json
{
  "suggestions": [
    { "id": "507f1f77bcf86cd799439011", "level": "state", "name": "Lagos", "parentId": null,
      "breadcrumbs": [{ "id": "507f1f77bcf86cd799439011", "level": "state", "name": "Lagos" }],
      "publishedStockCount": 12 }
  ],
  "revision": 3
}
```

Only active approved gazetteer entries with currently eligible published inventory appear. Response uses `Cache-Control: no-store`. Missing approved data returns `503 FEATURE_SEARCH_GAZETTEER_UNCONFIGURED`; missing child parent returns `422 CONTENT_LOCATION_PARENT_REQUIRED`; invalid/stale parent returns `422 CONTENT_LOCATION_PARENT_INVALID`. The route is rate limited. Do not use client-created location IDs or derive area IDs from map coordinates.

### Nearby

Example:

```http
GET /api/properties/map/nearby?lat=6.5244&lng=3.3792&radiusKm=10&queryVersion=canonical-v1&propertyTypes=detached_duplex,terraced_house&page=1&limit=25
```

`lat`, `lng`, and radius are all required. The stable names `nearbyLat`, `nearbyLng`, and `nearbyRadiusKm` are accepted aliases. If both spellings are supplied, numeric values must agree. `radius` is also accepted as a legacy radius alias. A successful response adds `center:[lng,lat]` and `radiusKm` to the canonical catalogue envelope. Default `withPhotosOnly` is `true`, matching the catalogue. If no approved maximum is configured, return `503 FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`; over maximum returns `422 CONTENT_QUERY_GEO_RADIUS_EXCEEDED`.

### Map response DTOs

Property detail mode:

```json
{
  "mode": "properties", "bounds": { "north": 7, "south": 6, "east": 4, "west": 3 },
  "zoom": 12, "total": 41, "truncated": true,
  "properties": [{ "_id": "…", "locationPoint": { "type": "Point", "coordinates": [3.38, 6.52] }, "canonicalEffectiveFields": {} }],
  "page": 1, "limit": 25, "sort": "recommended", "facets": {},
  "normalization": { "queryVersion": "canonical-v1", "query": {}, "notices": [] }
}
```

Cluster mode:

```json
{
  "mode": "clusters", "bounds": { "north": 7, "south": 6, "east": 4, "west": 3 },
  "zoom": 6, "total": 41, "priceAggregateState": "configured",
  "clusters": [{ "clusterId": "1:6.000:3.000", "lat": 6.5, "lng": 3.5,
    "propertyCount": 8, "sponsoredCount": 1, "minimumPrice": 25000000, "maximumPrice": 90000000 }],
  "page": 1, "limit": 25, "sort": "recommended", "facets": {},
  "normalization": { "queryVersion": "canonical-v1", "query": {}, "notices": [] }
}
```

`minimumPrice`/`maximumPrice` are NGN-comparable amounts. If any relevant foreign-currency listing lacks a permitted comparable rate, `priceAggregateState` is `fx_unconfigured`; do not present the available partial aggregate as complete. Clusters include no listing IDs. If `mapActive=false` or no viewport was supplied, map mode is `properties`, `bounds:null`, and only the current result page is returned as markers; it is not an unbounded all-catalogue pin list.

Project map returns at most the configured `MAP_MAX_PROPERTIES_PER_REQUEST`, reports `limit` and `truncated`, and emits one marker per matching published project with its matching-unit count, available/under-offer/sold counts, matching price ranges and `priceAggregateState`. It currently has no cluster-expansion cursor; the UI should request a narrower viewport before asking for additional markers.

## Facets and zero-result diagnostics

Facets are calculated over the full eligible set that matches the active criteria, before page slicing. They are not calculated from the visible page. Current response keys are:

```json
{
  "categories": {}, "propertyTypes": {}, "buildStages": {}, "availability": {},
  "unpriced": 0, "distressSale": 0, "verifiedListing": 0,
  "byField": {}, "byFieldTruncated": {}, "media": {
    "withPhotos": 0, "liveVideo": 0, "recordedVideo": 0,
    "threeDimensionalTour": 0, "floorPlan": 0, "drone": 0
  },
  "viewings": { "openHouse": 0, "openHouseThisWeekend": 0, "privateByAppointment": 0, "showHome": 0 },
  "freshness": {}, "priceCountsByCurrency": {}
}
```

Each dictionary-backed `byField` bucket is capped at 100 values and `byFieldTruncated[field]=true` indicates a capped bucket. Counts remain under the same current eligibility and price/POA policy as results. No private field is made a facet.

When there are zero results (except exact reference), `diagnostics` provides `state:"zero_results"`, `individuallyRelaxed[]`, and an ordered progressive `suggestions[]`. Each option includes a `change` and a `matched` count, or `state:"fx_unconfigured"` where applicable. The ordered ladder is: clear keywords, remove exact bedroom, broaden Estate→Area→LGA→State, then expand the selected price range by 20%. Suggestions are advisory: the server does not silently change the active request. Frontend sends the selected relaxed query explicitly.

## Saved searches and alert matching

### Saved Search DTO

```json
{
  "_id": "507f1f77bcf86cd799439012", "publicReference": "RTQ-SEARCH-…",
  "profileId": "507f1f77bcf86cd799439011", "name": "Lekki 3 bedroom",
  "filters": { "queryVersion": "canonical-v1", "sort": "recommended", "status": "available",
    "includeUnpriced": true, "withPhotosOnly": true, "includeUnderOffer": false, "includeSold": false,
    "state": "507f1f77bcf86cd799439013", "minBedrooms": "3" },
  "alerts": { "enabled": true, "cadence": "instant", "timeZone": "Africa/Lagos",
    "triggers": { "newListings": true, "priceReductions": false },
    "channels": { "inApp": true, "email": true, "sms": false, "whatsapp": false, "push": false } },
  "configurationRevision": 1, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Canonical filters are the ordinary canonical query object minus `page`, `limit`, and exact reference. Create/update validates them with the same canonical parser. New empty searches persist canonical defaults. Unversioned legacy filter DTOs remain readable for backwards compatibility; clients creating a Group 08 search must send `queryVersion:"canonical-v1"` so the scheduler uses canonical event matching. Editing the query resets pending batches and event cursors at the update boundary so historical listings are not re-alerted under changed criteria.

Request examples:

```http
POST /api/personalisation/searches
Authorization: Bearer <token>
X-Profile-ID: <active-profile-id>
Content-Type: application/json
```

```json
{
  "name": "Lekki 3 bedroom",
  "filters": { "queryVersion": "canonical-v1", "state": "<gazetteer-id>", "minBedrooms": "3", "sort": "recommended" },
  "alerts": { "enabled": true, "cadence": "instant", "triggers": { "newListings": true, "priceReductions": true }, "channels": { "inApp": true, "email": true } }
}
```

Response is HTTP 201 `{ "savedSearch": SavedSearchDTO }`. Updates use `PATCH /api/personalisation/searches/:id` and may include `expectedConfigurationRevision`; mismatch returns `409 CONFLICT_SAVED_SEARCH_VERSION`. Delete returns `{ "deleted": true }`.

`alerts` accepts only `enabled:boolean`, `cadence:instant|daily|weekly`, optional valid IANA `timeZone`, `triggers.newListings:boolean`, `triggers.priceReductions:boolean`, and channel booleans `inApp`, `email`, `sms`, `whatsapp`, `push`. Defaults are disabled, daily, new listings on, price reductions off, in-app/email on, other channels off. Daily/weekly scheduling uses the approved Console `saved_search_cadence` policy; without it, the worker pauses without committing event cursors or clearing the pending batch. `instant` does not require calendar cadence policy. Channel delivery still depends on notification configuration and user preferences. There is no endpoint to force a delivery or advance a cursor.

## Errors and configuration gates

| HTTP | Code | Meaning / client action |
|---|---|---|
| 400 | `CONTENT_QUERY_INVALID`, `CONTENT_QUERY_FILTER_VALUE_INVALID`, `CONTENT_QUERY_UNSUPPORTED_FILTER`, `CONTENT_QUERY_REMOVED_FILTER`, `CONTENT_QUERY_ALIAS_CONFLICT`, `CONTENT_QUERY_VERSION_UNSUPPORTED`, `CONTENT_QUERY_STATUS_INVALID`, `CONTENT_QUERY_SORT_INVALID`, `CONTENT_QUERY_REFERENCE_INVALID`, `CONTENT_QUERY_GEO_INVALID`, `CONTENT_QUERY_GAZETTEER_ID_REQUIRED`, `CONTENT_QUERY_GAZETTEER_LEVEL_INVALID`, `CONTENT_QUERY_LOCATION_LIMIT` | Correct the submitted query. Do not drop errors and retry as an unfiltered catalogue. |
| 422 | `CONTENT_QUERY_HANDOVER_INVALID`, `CONTENT_QUERY_GEO_RADIUS_EXCEEDED`, `CONTENT_QUERY_COMMUTE_TOO_BROAD`, `CONTENT_QUERY_LOCATION_AMBIGUOUS`, `CONTENT_QUERY_LOCATION_UNRESOLVED`, `CONTENT_LOCATION_QUERY_INVALID`, `CONTENT_LOCATION_PARENT_REQUIRED`, `CONTENT_LOCATION_PARENT_INVALID` | Correct range, narrow destination set, choose a supported location level, or select an exact current gazetteer suggestion and required parent. |
| 403 | `AUTH_REGISTERED_REQUIRED`, `PERMISSION_PROFILE_REQUIRED`, `AUTH_PROFILE_FORBIDDEN`, or current-session errors | Sign in, select an authorized profile, or request the relevant permission. No public fallback for personal data. |
| 404 | `CONTENT_LOCATION_NOT_FOUND` | Location is no longer active or has no currently eligible inventory; refresh suggestions. |
| 409 | `CONFLICT_SAVED_SEARCH_VERSION` | Reload saved search and resolve edits before retrying. |
| 422 | `CONTENT_SAVED_SEARCH_INVALID`, `CONTENT_ALERT_SETTINGS_INVALID`, `CONTENT_PERSONALISATION_QUERY_INVALID` | Correct the request body or pagination. |
| 503 | `FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`, `FEATURE_SEARCH_GAZETTEER_UNCONFIGURED`, `FEATURE_SEARCH_GAZETTEER_SOURCE_UNAVAILABLE`, `FEATURE_SEARCH_LOCATION_PROVIDER_UNAVAILABLE` | Geographic capability unavailable. Keep query state; show a safe unavailable state. |
| 503 | `FEATURE_SEARCH_FX_UNCONFIGURED` | An approved current NGN/USD rate is required under the active missing-rate policy. Never compare nominal USD and NGN amounts. |
| 503 | `FEATURE_SEARCH_COMMUTE_UNCONFIGURED`, `FEATURE_SEARCH_COMMUTE_PROVIDER_UNAVAILABLE`, `FEATURE_SEARCH_COMMUTE_PROVIDER_INVALID` | Route-time search unavailable; do not substitute distance. |
| 503 | `FEATURE_POLICY_UNCONFIGURED` for verification-backed search; `FEATURE_SEARCH_TRUST_TIER_POLICY_UNCONFIGURED` | Keep the requested verified/trust capability unavailable; do not fabricate signals. Recommended itself uses its documented silent newest-first fallback. |
| 503 | `FEATURE_PROFILE_INDEX_MIGRATION_REQUIRED` | Saved-search personalisation index rollout is required before that operation can proceed. |

Private saved-search and notification data uses private/no-store responses. External activation gates include the approved location dataset/provider, `SEARCH_NEARBY_MAX_RADIUS_KM`, Mapbox route configuration, approved FX settings/rates, Console policies for freshness/recommended/trust/verification/POA/cadence, notification channels, and required database indexes. Configuring credentials alone does not prove provider or policy readiness.

### Relevant runtime configuration

| Capability | Backend configuration | Behavior while unavailable |
|---|---|---|
| Nearby radius | `SEARCH_NEARBY_MAX_RADIUS_KM`; there is no approved operational fallback. | Nearby returns `503 FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`. |
| Map viewport and clustering | `MAP_PROPERTY_DETAIL_MIN_ZOOM`, `MAP_CLUSTER_COARSE_MAX_ZOOM`, `MAP_CLUSTER_MEDIUM_MAX_ZOOM`, the three `MAP_CLUSTER_*_PRECISION_DEGREES` values, `MAP_MAX_PROPERTIES_PER_REQUEST`, and `MAP_MAX_VIEWPORT_AREA_DEGREES`. | Safe bounded defaults are used where defined; invalid values fail configuration loading. Over-wide viewports are rejected. |
| Commute time | `MAPBOX_ACCESS_TOKEN`, `MAPBOX_COMMUTE_PROFILE`, `MAPBOX_COMMUTE_MAX_DESTINATIONS`. | Commute filter returns a stable 503; there is no distance-based approximation. |
| Location search | `LOCATION_PROVIDER`, `LOCATION_GAZETTEER_SOURCE`, `LOCATION_BOUNDARY_SOURCE`; approved active gazetteer revision and boundary data as configured. | Suggestions, resolution, and location filters return an explicit unconfigured/unavailable state; no fabricated location IDs. |
| Currency comparison | `FX_RATE_PROVIDER`, `FX_MAX_RATE_AGE_MINUTES`, `FX_CONVERSION_ENABLED`, `FX_MISSING_RATE_POLICY`, `FX_SUPPORTED_CURRENCIES`, plus an approved current rate source/policy. | NGN-comparable records remain valid; USD membership/sort/cluster aggregation follows the configured missing-rate policy and is never compared at face value. |
| Largest price reduction | `PROPERTY_PRICE_REDUCTION_SORT_MODE=percentage|absolute`; default `percentage`. `absolute` uses the same approved FX evidence and missing-rate policy as NGN price comparison. | Percentage mode works without FX. In absolute mode, an unconvertible USD reduction sorts after comparable reductions and adds `FX_CONVERSION_UNAVAILABLE` when `exclude_conversion` applies; `fail_price_query` returns `503 FEATURE_SEARCH_FX_UNCONFIGURED` when a verified USD reduction needs comparison. |
| POA | `LISTING_POA_PUBLICATION_POLICY`, `LISTING_POA_FILTER_POLICY`, `LISTING_POA_SORT_POLICY`, `LISTING_RESERVE_VISIBILITY`, `LISTING_POA_RESERVE_CONFLICT_POLICY`. | POA stays a distinct unpriced value; it is never treated as zero. Reserve remains private. |
| Recommended and trust ranking | Versioned Console policies `recommended_weights`, `profile_completeness_criteria`, `sponsored_placements`, and `trust_tier_thresholds`, plus genuine current source records. | Recommended falls back silently to newest-first when required positive-weight inputs are unavailable. Trust Tier returns its explicit configuration gate. |
| Verification and freshness | Versioned Console policies `listing_verification` and `freshness`, plus current evidence/projection data. | Verification-backed filtering/sort is gated; freshness-dependent rank falls back safely. |
| Alert cadence and delivery | Versioned Console policy `saved_search_cadence`; scheduler controls `MARKETPLACE_ALERT_SCHEDULER_INTERVAL_MS`, `SEARCH_ALERT_MAX_SEARCHES_PER_RUN`, `SEARCH_ALERT_MAX_EVENTS_PER_BATCH`, and `SEARCH_ALERT_MAX_CHUNKS_PER_SEARCH`; notification provider/channel configuration. | Instant matching is worker-driven. Daily/weekly pause without the approved cadence policy and retain pending state/cursors. Delivery follows user preferences and channel readiness. |

## Source implementation references

- Mounted routes: `src/app.js`, `src/routes/propertyRoutes.js`, `src/routes/projectRoutes.js`, `src/routes/locationRoutes.js`, `src/routes/personalisationRoutes.js`.
- Canonical parsing/matching, sort, facets, clusters, diagnostics and shared projection checks: `src/services/canonicalCatalogueService.js`.
- Query response/controllers: `src/controllers/propertyController.js`, `src/controllers/projectController.js`, `src/services/projectService.js`.
- Canonical field vocabulary: `src/constants/sourceListingFields.js`, `src/constants/listingDictionary.js`.
- Gazetteer API: `src/controllers/locationGazetteerController.js`, `src/services/locationGazetteerService.js`.
- Saved-search persistence and alert DTO: `src/services/personalisationService.js`, `src/models/SavedSearch.js`.
- Alert event discovery, canonical event matching, retries/cursors: `src/services/marketplaceAlertService.js`, notification delivery integration in `src/services/notificationDeliveryService.js`.
- FX and commute: `src/services/searchFxService.js`, `src/services/mapboxCommuteService.js`.
- Ranking and eligibility: `src/services/listingTrustRankingService.js`, `src/services/listingProfileTrustRankingService.js`, `src/services/listingReviewRankingService.js`, `src/services/profileCompletenessRankingService.js`, `src/services/sponsoredPlacementService.js`, `src/services/advertiserProvenanceService.js`.
- Centralized operational values: `src/config/firstBatchPolicies.js`, `.env.example`, and approved Console policy records.
