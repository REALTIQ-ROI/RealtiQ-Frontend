# Search, maps and discovery

The RQS-03 request is server-side and URL-addressable. Prefer `queryVersion=canonical-v1`. The canonical effective-unit query is shared by property catalogue/map/nearby, project grouping/map/matching units, facets/counts and saved-search matching. Ordinary values within one multi-select attribute use OR; separate attributes use AND; selected amenities and keyword tokens use strict AND. Every predicate applies to the same effective unit. Never locally broaden a 503/422 query.

## Main endpoints

| Endpoint | Request and response |
|---|---|
| `GET /api/properties?queryVersion=canonical-v1` | Query parameters below; response contains `properties`, `total`, `page`, `limit`, `sort`, `facets`, `normalization:{queryVersion,query,notices}` and zero-result `diagnostics` when available. Exact-reference queries return at most one eligible public listing. |
| `GET /api/properties/map?queryVersion=canonical-v1` | Same query contract. Response adds `map`/pins or clusters and retains total/facets/pagination/normalization. Current map mode is zoom-aware; no private coordinates or inventory is returned. |
| `GET /api/properties/map/nearby?nearbyLat=…&nearbyLng=…&nearbyRadiusKm=…` | Nearby center/radius are all required together; radius maximum must be configured. Response `{center:[lng,lat],radiusKm,properties,total,page,limit,facets,normalization}`. |
| `GET /api/projects?queryVersion=canonical-v1` | Shared unit query grouped into matching projects; project cards expose matching-only aggregates and bounded matching-unit preview, not unrelated inventory. |
| `GET /api/projects/map?queryVersion=canonical-v1` | Same matching query summarized as map project markers/clusters. |
| `GET /api/projects/:idOrSlug/properties?queryVersion=canonical-v1&page=1&limit=50` | Project-scoped matching units; project scope is ANDed even with exact reference. Public uses eligible published units. Authenticated owner can use supported `includeUnpublished=true` management path separately. |
| `GET /api/properties/field-dictionary` | Public canonical listing taxonomy and field dictionary. |
| `GET /api/locations/gazetteer/status`, `/api/locations/suggestions`, `/api/locations/:id` | Public active directory state, suggestions and stable location/breadcrumb DTO. Parent is mandatory for child suggestion levels. |
| `GET/POST /api/personalisation/searches`; `GET/PATCH/DELETE /api/personalisation/searches/:id` | Current profile-owned saved searches. See Saved searches below. |

Search is optional-auth for public inventory. `fromAccountsIFollow=true` requires a registered current profile and never falls back to an unfiltered query. `X-Profile-ID` is required for authenticated profile state. Normal successful catalogue errors use the shared `{message,code}` envelope; query notices are response data, not errors.

## RQS-03 inventory: 66 filter/control atoms

The IDs below are handoff crosswalk labels, not IDs printed in the RQS. Runtime implementation is through `canonicalCatalogueService.normalizeCanonicalQuery`, source field metadata and the shared candidate matcher. Status refers to internal behavior; gates are named separately.

| ID | RQS-03 control | Current request key / behavior | Status and gate |
|---|---|---|---|
| F01 | State | `state` stable ID or exact approved name | Implemented; readable-name gate requires approved gazetteer. |
| F02 | LGA | `lga` | Implemented; parent/child ancestry required. |
| F03 | Area | `area` | Implemented; parent/child ancestry required. |
| F04 | Gated estate | `gatedEstate`, `estateName` | Implemented; estate name resolution requires approved gazetteer. |
| F05 | Location typeahead/suggestions and nearby maximum | `/api/locations/suggestions`; `nearbyLat`, `nearbyLng`, `nearbyRadiusKm` | API implemented; authoritative gazetteer and `SEARCH_NEARBY_MAX_RADIUS_KM` required; without max, 503 `FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`. |
| F06 | Map viewport | `north`, `south`, `east`, `west`, `mapActive`, `mapZoom` (`zoom` alias) | Implemented; all bounds required if active; area cap from policy. |
| F07 | Commute 15/30/45/60 minutes | `commuteFrom=<lng>,<lat>&commuteMinutes=15|30|45|60` | Adapter/predicate implemented; approved Mapbox/routing credentials/policy required; safe 503 when unavailable. |
| F08 | Minimum price | `minPrice` or `min_price` | NGN supported; USD conversion requires approved current FX evidence. |
| F09 | Maximum price | `maxPrice` or `max_price` | Same FX policy as F08. |
| F10 | Under ₦25M | `priceBand=under_25m` | Whole-NGN band; foreign-price comparison requires FX policy. |
| F11 | ₦25M–₦50M | `priceBand=25m_50m` | Same. |
| F12 | ₦50M–₦100M | `priceBand=50m_100m` | Same. |
| F13 | ₦100M–₦250M | `priceBand=100m_250m` | Same. |
| F14 | ₦250M–₦500M | `priceBand=250m_500m` | Same. |
| F15 | ₦500M–₦1B | `priceBand=500m_1b` | Same. |
| F16 | Over ₦1B | `priceBand=over_1b` | Same. |
| F17 | Price reduced since original listing | `reducedSinceListing=true` or `price_reduced=true` | Uses persisted asking-price history; no inferred reductions. |
| F18 | Price negotiable | `negotiable=true` or `price_negotiable=true` | Effective canonical value. |
| F19 | Service charge Any/None | `serviceCharge=any|none` | Explicit None differs from missing/unknown. |
| F20 | Service-charge cap | `serviceCharge=up_to_500k|up_to_1m|up_to_2.5m|up_to_5m` | Annual amount caps. |
| F21 | Include unpriced/POA | `includeUnpriced=true|false` | Default true; POA is not zero; bounded price behavior follows approved POA policy. |
| F22 | Outright/Instalment | `paymentOptions` or `payment_type` | Canonical effective payment options; OR within selected values. |
| F23 | Instalment duration | `instalmentDuration=any|6+|12+|24+|36+` (`installmentDuration` alias) | Implies instalment unless explicitly excluded; then dependent filter is cleared/noticed. |
| F24 | Initial deposit cap | `initialDepositCap=any|10|20|30|50` | Percent upper cap; dependent on instalment. |
| F25 | Escrow available | `escrowAvailable=true|false` | Positive true filter; false clears the filter, does not mean “no escrow”. |
| F26 | Mortgage Accepted launch filter | No public key/value exposed before active Mortgage Partner policy | Not applicable while launch gate is off; do not display unsupported choice. |
| F27 | Eight build stages | `buildStage` or `completionStage` alias | Supported source stages are multi-select. |
| F28 | Ready to Move In | `readyToMoveIn=true` | Macro restricts to Newly built, Renovated, Previously owned; clears incompatible handover controls with notice. |
| F29 | Construction milestone | Canonical `constructionMilestone` and source filter value | Supported named milestone values only. Source says 16 but names 15; missing value is source-decision blocked. |
| F30 | Handover month from/by | `handoverFrom`, `handoverBy` as `YYYY-MM` | Applies to scheduled construction stock; reversed bounds swap with notice. |
| F31 | Bedrooms | `bedrooms`, `minBedrooms`, `maxBedrooms`, `min_beds`, `max_beds`, `exact_beds` | Effective unit; exact `6+` means ≥6. |
| F32 | Full bathrooms | `fullBathrooms`, `bathrooms`, min/max/exact aliases | Effective value; commercial null does not exclude when unset. |
| F33 | Powder rooms/toilets | `powderRooms`, `toilets`, min/max/exact aliases | Effective value; explicit count only. |
| F34 | All en-suite | `allBedroomsEnSuite` | Canonical true/false. |
| F35 | Internal floor area | `internalFloorArea`, `minInternalFloorArea`, `maxInternalFloorArea` | Square metres. |
| F36 | Footprint/built-up area | `unitFootprint`, `minBuiltUpArea`, `maxBuiltUpArea` | Square metres. |
| F37 | Plot/shared site size | `plotSize`, `minPlotArea`, `maxPlotArea` | Descriptive physical site attribute, not land listing. |
| F38 | Number of floors | `numberOfFloors=any|2|3|4+` | Restricts to Terraced House/Townhouse types. |
| F39 | Furnishing | `furnishing` | Source enum. |
| F40 | Serviced | `servicedStatus` | Source enum. |
| F41 | Parking | `parkingSpaces` | Effective count/condition. |
| F42 | Access road | `accessRoadConditions` | Multi-value source enum. |
| F43 | Occupancy/sold with occupiers | `occupancy` plus canonical availability/sale evidence | Uses current, system-backed sale state; not free-text status. |
| F44 | Architectural style | `architecturalStyle` | Fixed source catalogue; typed custom display text does not match. |
| F45 | Amenities, strict AND | `unitFeatures`/`amenities` alias | All selected amenities must exist in effective unit+project facilities. |
| F46 | Declared title | `rootTitleDeclarations`/`title` alias | Declared source value; not itself verified title. |
| F47 | Platform-Verified Title | `platformVerifiedTitleOnly=true` | Current version/evidence-backed title signal. |
| F48 | Platform-Verified Listing | `platformVerifiedListingOnly=true` | Current approved listing-verification evidence. |
| F49 | Listed By | `advertiserType` | Current profile provenance (Owner/Agent/Developer), not stale property labels. |
| F50 | From accounts followed | `fromAccountsIFollow=true` | Requires current registered active profile; no unfiltered fallback. |
| F51 | Added to site / age | `publishedWithin=anytime|24h|3d|7d|14d|30d` | Uses original publication time, not edit time. |
| F52 | Availability/status | `status=available|all|under_offer|sold`; defaults available | Current public availability and publication eligibility; Not released is never public. |
| F53 | With photos only | `withPhotosOnly=true|false` | Default true; typed released image media. |
| F54 | Live/recorded video | `videoTour=live|recorded` (or `hasVideoTour`) | Typed live/recorded media/viewing evidence. |
| F55 | 3D/virtual tour | `has3dTour=true` | Approved provider URL/reference only. |
| F56 | Floor plan | `hasFloorPlan=true` | Typed media. |
| F57 | Drone/fly-through | `hasDroneFlyThrough=true` | Typed media. |
| F58 | Open house | `openHouse=true` | Scheduled viewing data. |
| F59 | Open house this weekend | `openHouseThisWeekend=true` | Uses configured timezone/schedule semantics. |
| F60 | Private showings | `privateShowingsByAppointment=true` | Canonical viewing signal. |
| F61 | Show home | `hasShowHome=true` | Current project/type show-home signal. |
| F62 | Distress sale | `distressSaleOnly=true` | Requires independently reviewed evidence; not seller assertion alone. |
| F63 | Keywords | `search=<terms>` | Up to 10 terms, each ≤64 characters; strict AND, plus all other criteria. |
| F64 | Exact public reference | `reference` or `exactReference` | Pauses other filters/sort, still enforces public eligibility, at most one result. |
| F65 | Default sort/clear all/URL state | `sort`, defaults described below; query supports round-trip | Canonical service normalizes aliases and returns `normalization.query`/`notices`; Clear All is a frontend behavior restoring defaults. |
| F66 | Display currency/Featured filter | No search parameter | Not a buyer filter; display currency does not change membership; Featured is editorial and does not rank. |

Supported search field criteria can be sent by canonical source field key and numeric `minX`/`maxX`/`exactX` patterns only where the field is searchable and numeric. Source URL aliases include `type`, `beds`, `toilets`, `title`, `payment_type`, `price_negotiable`, `price_reduced`, `search_as_i_move_the_map`, and snake-case range names. Conflicting alias/canonical duplicates return `400 CONTENT_QUERY_ALIAS_CONFLICT`. Unsupported or removed keys return a 400 error rather than being ignored.

## All 12 RQS-03 sorts

| RQS label | Canonical key | Deterministic behavior/gate |
|---|---|---|
| Recommended (default) | `recommended` | Approved weights across current verification, released media richness, freshness, approved public profile completeness and eligible Sponsored placement. Missing positive-weight signals discard partial scores, return `RECOMMENDED_SIGNAL_UNAVAILABLE` notice and newest-first fallback. |
| Newest / Most Recent | `newest` (`newest_most_recent`, `recent`) | Original publication recency, stable ID tie. |
| Price Low to High | `price_asc` (`price_low_to_high`) | POA/unpriced follows configured unpriced-last; USD conversion requires approved current rate. |
| Price High to Low | `price_desc` (`price_high_to_low`) | Same conversion and POA rule. |
| Handover Date Soonest | `handover_soonest` (`handover_date_soonest`) | Applicable scheduled handover only; stable tie. |
| Verified First | `verified_first` | Current evidence-verified listing first; then available Recommended score, else deterministic newest fallback notice. |
| Recently Reduced | `recently_reduced` | Latest valid persisted reduction date first. |
| Price Reduced Largest Drop | `largest_reduction` (`price_reduced_largest_drop`) | Valid original/current reduction magnitude; no currency-change inference. |
| Bedrooms Most | `bedrooms_desc` (`bedrooms_most`, `bedrooms`) | Effective value on matching unit. |
| Floor Area Largest | `floor_area_desc` (`floor_area_largest`, `floor_area`) | Effective internal floor area. |
| Highest Rated | `highest_rated` | Qualifying rating (requires at least two reviews), average then count; Recommended tie when available, then recency/ID. |
| Trust Tier | `trust_tier` | Approved current trust policy required; tier/score then Recommended tie when available, then recency/ID. Returns 503 if tier thresholds are unconfigured. |

## Facets, map and zero results

Facets are calculated over the same eligible matching set and do not expose private fields. Map bounds require all four valid bounds when `mapActive=true`; `mapZoom` and `zoom` must agree. Map controls are policy bounded. Search response includes source normalization notices such as `RANGE_SWAPPED`, `DEPENDENT_FILTERS_CLEARED`, `LOCATION_PARENT_ABSORBED`, and `FX_CONVERSION_UNAVAILABLE`.

Zero-result `diagnostics` are advisory: state, one-at-a-time relaxed counts, and suggested filter removals; the active query is never changed server-side. The RQS fallback ladder describes clearing keyword/exact bedroom, broadening Estate→Area→LGA and then expanding entered price bounds; frontend should present suggestions rather than silently applying them.

## Saved searches and alerts

Routes: `GET/POST /api/personalisation/searches`, `GET/PATCH/DELETE /api/personalisation/searches/:id`. Bearer and active profile required; list/get/update/delete are owner scoped. Persist canonical `queryVersion`, filters, bounds, sort, explicit defaults, cadence, timezone, channels and new/reduced match triggers. Body shapes are owned by `personalisationService.createSavedSearch/updateSavedSearch`; unknown filters are rejected by canonical normalization. Responses use `{savedSearch}` for create/get/update and list service envelope; inspect current controller when needing the exact full object type. Stale edits return `409 CONFLICT_SAVED_SEARCH_VERSION`.

Supported cadence values are `instant`, `daily`, `weekly`. Instant uses durable event matching. Daily/weekly depends on approved `saved_search_cadence` Console policy; absent policy pauses without advancing the cursor. Matching rechecks current listing eligibility, user/profile notification preferences and current authorization before dispatch. Event batches persist cursors and deduplicate; queued notifications are not proof of provider delivery. Provider channels are gated by approved notification policy and credentials. No alert endpoint delivers a client-fabricated match.

## Configuration and failures

Important stable errors: `CONTENT_QUERY_INVALID`, `CONTENT_QUERY_SORT_INVALID`, `CONTENT_QUERY_UNSUPPORTED_FILTER`, `CONTENT_QUERY_REMOVED_FILTER`, `CONTENT_QUERY_FILTER_VALUE_INVALID`, `CONTENT_QUERY_STATUS_INVALID`, `CONTENT_QUERY_ALIAS_CONFLICT`, `CONTENT_QUERY_GEO_INVALID`, `CONTENT_QUERY_LOCATION_LIMIT`, `CONTENT_QUERY_LOCATION_AMBIGUOUS`, `CONTENT_QUERY_LOCATION_UNRESOLVED`, `CONTENT_QUERY_GAZETTEER_LEVEL_INVALID`, `FEATURE_SEARCH_GEO_RADIUS_UNCONFIGURED`, `CONTENT_QUERY_GEO_RADIUS_EXCEEDED`, `FEATURE_SEARCH_COMMUTE_UNCONFIGURED`, `FEATURE_SEARCH_FX_UNCONFIGURED`, `FEATURE_SEARCH_TRUST_TIER_POLICY_UNCONFIGURED`, `FEATURE_SEARCH_FRESHNESS_POLICY_UNCONFIGURED`, `FEATURE_POLICY_UNCONFIGURED`. Preserve all filters on errors and show the specific unavailable dependency. See [configuration gates](12-configuration-gates-and-open-decisions.md).


## Shared contract references

Contract cross-reference: search-result/map/facet DTO notes are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md), response variations in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md), and search/save/alert sequences in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
