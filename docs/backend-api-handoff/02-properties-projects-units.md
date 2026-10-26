# Properties, projects, unit types and units

The public vocabulary is defined in [the 156-field dictionary](03-canonical-field-dictionary.md) and returned by `GET /api/properties/field-dictionary`. Forms should render entity-specific fields and conditions from the server contract; do not construct a parallel front-end field taxonomy.

## Main listing routes

| Endpoint | Request/response | Authorization |
|---|---|---|
| `GET /api/properties` | Query-based search; see [search contract](04-search-maps-discovery.md). Canonical response includes `properties`, `total`, `page`, `limit`, `sort`, `facets`, `normalization:{queryVersion:"canonical-v1",query,notices}` (and diagnostics when zero matches). | Optional auth; public eligible inventory only. |
| `GET /api/properties/:id` | Public-safe detail DTO; ID may be supported public reference per controller. | Optional auth; unpublished/ineligible inventory resolves as not found to public callers. |
| `GET /api/properties/mine?page=1&limit=20` | Current-profile owner/assignment/mandate scoped listing result. | Bearer + current `X-Profile-ID`, Registered and current `listing.read`. |
| `POST /api/properties` | JSON canonical/legacy intake fields; response `201 {property, titleDocuments, titleVerifications, riskDetected, message}` from `propertyController.createProperty`. Project-unit responses include `canonicalUnitTypeId` and `projectUnit`; draft `paymentTypes:[]` remains unanswered. Include `Idempotency-Key`/operation key only where route contract specifies it; submit expected version only for updates. | Verified current profile and request-bound step-up as dynamically required; current listing create, KYC, owner/mandate, seat and eligibility checks. |
| `PATCH /api/properties/:id` | Partial mutation; send only explicitly supported legacy fields or `canonicalFieldMutations` and `expectedVersion` where provided. The response is the property DTO at the JSON root (including `version`), not wrapped in `{property:...}`. | Current selected profile, field-specific `listing.edit`/`listing.price`/`listing.media`, resource assignment/mandate, KYC, step-up and current version. |
| `DELETE /api/properties/:id` | `{expectedVersion?}` when required. Archive/soft delete; historical references retained. | Current listing owner/editor permission + step-up; sold/history protection applies. |
| `POST /api/properties/:id/buy` | Purchase operation body is routed to current cart/checkout eligibility; use cart checkout APIs for first-party cart flow. | Buyer role, Verified access and step-up. |
| `GET /api/projects`; `GET /api/projects/map` | Public project cards / grouped canonical results; query as in search document. | Optional auth; published and eligible projects only. |
| `GET /api/projects/:idOrSlug` | `{project: safe public project DTO}`. | Public current publication status. |
| `GET /api/projects/:idOrSlug/properties` | Query pagination and effective matching-unit public DTOs. With `includeUnpublished=true`, route uses private management path, not public projection. | Optional for published inventory; current owner profile permission for unpublished management. |
| `GET /api/projects/:projectId/manage` | `{project: owner/manage DTO}`. | Bearer/current `X-Profile-ID`, current `project.read`. |
| `POST /api/projects` | JSON project creation; `201 {project}`. | Verified profile, current project permission, KYC/organization eligibility; conditional step-up. |
| `PATCH /api/projects/:id`; `DELETE /api/projects/:id` | Versioned canonical mutations / publication actions; `PATCH` returns `{project}` and DELETE returns `{message:"Project deleted"}` only for an empty project. DELETE is not archival and fails if units/history reference it. | Current project permission, owning profile/signatory restrictions and step-up; see exact DTOs below and in chapter 20. |

## Unit types and inventory

Mounted unit-type routes are `GET/POST /api/projects/:projectId/unit-types`, `GET /api/projects/:projectId/unit-types/:unitTypeId/impact`, `PATCH /api/projects/:projectId/unit-types/:unitTypeId`, and `DELETE /api/projects/:projectId/unit-types/:unitTypeId`. There is no plain type-detail GET or type archive route. List, create and update DTOs expose raw `canonicalFields`, `effectiveFields`, `fieldSources`, type `version`, `projectVersion` and safe media. Create requires the current project version; update and delete require both project and type versions. Delete is refused if any unit references the type. Full request/response examples are in [chapter 20](20-pass01-03-contract-remediation.md#4-unit-type-crud-and-project--type--unit-setup). The project owns stable type IDs. Units are created through `POST /api/properties` with `projectId` and `canonicalUnitTypeId`, not through a generic `/api/units` or grid-create route.

Project grid routes:

- `GET /api/projects/:projectId/unit-grid` supports server pagination, sort/filter, effective values and provenance.
- `GET /api/projects/:projectId/unit-grid/export.csv` returns a private CSV; request query uses grid filters (no `page`/`limit`), export is bounded, formula-safe and omits reserve, private title, transaction and contact fields.
- `POST /api/projects/:projectId/unit-grid/bulk` applies bounded direct edits; current profile permission, expected project/unit versions and canonical validation are checked.
- `POST /api/projects/:projectId/unit-grid/jobs` accepts a durable operation body and returns `202 {job}`. Poll `GET /:projectId/unit-grid/jobs/:jobId`; `POST .../cancel` is cooperative. Per-row outcomes and `operationId`s are in safe job DTO.
- `POST /api/projects/:projectId/unit-grid/operations/:operationId/undo` restores only if the recorded post-version still matches and no sold/transaction evidence makes undo unsafe.

Exact grid request action schemas and error codes live in `05-imports-grids-bulk-operations.md`. Bulk deletion is intentionally not mounted; unit archive retains history. Project DELETE is different: it physically deletes only an empty project and refuses projects with units. Publish/unpublish/freshness are state transitions, not generic field edits. Failed project publication now returns a safe allowlisted `publicationReadiness` error object; see chapter 20.

## Canonical state, inheritance and readiness

Canonical source fields are placed at project, unit-type, property/unit, or system/workflow level as specified in the dictionary. Effective unit values resolve `unit override → unit type → project default` only for fields whose inheritance metadata says so. `unitOverrides` and source-specific reset actions preserve the difference between inherited and explicitly set values. Do not send `null` as a reset sentinel; use the documented reset operation or clear the override through the entity mutation contract.

For drafts, persist permitted incomplete values and display readiness blockers. Publication readiness is computed from the effective values and source-owned workflow evidence. Project publish-all publishes ready units only; selected publish checks each selected unit independently; blocked units remain unpublished and include field-specific blockers. A readiness response is informational unless the explicit publish transition is invoked.

Availability source enum is `Available`, `Under Offer`, `Sold`, `Not released`. Public query status defaults to Available; Not released is never public. Sold and actual sale fields are transaction/workflow-owned; do not patch Sold from a text form. Once sold/history exists, type moves, archive, import updates and undo are restricted.

## Pricing and price history

Price is an amount plus currency, or an explicit POA state. `0` is a numeric value; it is never POA. Reserve is a seller-only encrypted/private workflow, not an ordinary public field or generic mutation. Unit price override can be reset to type-level price. The shared asking-price history tracks original/current ask and recorded reductions without resetting original publication time; use `GET /api/properties/:id/price-history` and `/price-history/chart` for public-safe history/graph. Never expose reserve, actual sale amount, sale completion date, raw seller identity or private history metadata.

`GET/PUT /api/profiles/current/properties/:id/private-price` is the profile-bound private reserve flow; PUT is step-up protected and requires current listing ownership/`listing.price` authority and configured private encryption. POA/reserve conflict behavior follows the active policy; do not invent a sale price.

## Publication, verification, ownership, duplicates

- Property/project owner and organization mandate/seat checks are current at each mutation; a shared account holder does not collapse company profiles.
- Listing readiness is not listing verification. Platform-Verified Title and Platform-Verified Listing are separate evidence-driven signals. `GET /api/properties/:id/listing-verification`, evidence list/upload and POST submit are owner routes; staff decisions are under `/api/admin/listing-verifications`.
- Title declaration is seller-provided public declaration; title evidence and verification file remain protected.
- Duplicate candidate/link routes under `/api/properties/:id/duplicate-*` preserve both listing IDs; candidates are advisory, and independent review decides. Never merge based on the candidate list alone. A sold relisting is authorized by current buyer-of-record or independently approved version-bound transfer proof.
- `POST /api/properties/:id/confirm-details` and `/api/projects/:id/confirm-details` record monthly freshness confirmation according to approved policy; `POST /:id/report-outdated` records a report. Do not locally invent amber/checkout thresholds.
- Construction update routes are `/api/properties/:id/construction-updates` GET/POST and `/api/properties/:id/off-plan/complete` PATCH. Project association uses PATCH/DELETE `/api/properties/:id/project` with step-up and expected version.

## Media and compatibility

Public media is returned as sanitized public media DTOs only after release. Protected evidence/document assets use `/api/documents` and never public storage URLs. `POST /api/projects/:id/media` associates authorized project media references; `POST /api/media/upload` is a separate authorized multi-file upload with `files` part. Media section determines media kind; do not accept caller MIME/classification as authority.

Canonical migration review routes `GET /api/properties/canonical-migration-review` and `GET /api/projects/canonical-migration-review` return only the current actor's review items. Owner reclassification routes `POST /:id/canonical-reclassification`; rollback routes `POST /:id/canonical-migrations/:migrationId/rollback`. They are admin/review workflows with current step-up and version fencing, not public APIs. Do not initiate production migration from the frontend.

## Virtual-tour contracts

Public provider capability discovery is `GET /api/virtual-tours/providers`; it returns `{enabled,defaultProvider,providers,publicConfiguration}`. Public provider config is intended for SDK initialization only; never expose stored source work URLs/raw provider responses. Property reads are `GET /api/properties/:id/virtual-tour`, `/virtual-tour/floorplan`, `/virtual-tour/measurements`, and `/virtual-tour/rooms`; they return provider-resolved public DTOs and may return an explicit unavailable/not-ready state.

Property provider configuration paths are `PATCH /api/properties/:id/virtual-tour/realsee`, `/matterport`, and `/provider`; project override is `PATCH /api/projects/:id/virtual-tour/provider`. Provider field bodies:

- Realsee: `workId` is required to enable configuration; `workUrl?`, `vrUrl?`, `enabled?`, and `expectedVersion?` are accepted. The provider validates/normalizes permitted URLs.
- Matterport: `modelSid` is required to enable configuration; `showcaseUrl?`, `enabled?`, and `expectedVersion?` are accepted. `modelSid` must meet the provider's 11-character model identifier rule; a valid public showcase URL is generated if omitted.
- Override: `{provider:"realsee"|"matterport"|null,expectedVersion?}`; null clears override and restores inheritance.

The provider-specific strings are capped at 4096 characters; `enabled` is boolean and version is a non-negative integer. Provider must be enabled by platform settings and external validation must return `ready|processing`; a provider validation/configuration error is surfaced rather than treating a URL as configured. Success is `{propertyId,provider,version,tour:{enabled,status,workId|modelSid,capabilities,configurationPending,configuredAt,readyAt,failedAt}}` or `{projectId,version,virtualTourProviderOverride}`. Current verified listing-media permission/resource authority is checked and audit recorded; supplied `expectedVersion` guards concurrency. Owner-facing configure routes do not mount step-up middleware; use the response/current permission result and do not add an undocumented header.

## Errors and form handling

Handle `LISTING_FIELDS_INVALID` with per-field `errors`; `CONFLICT_LISTING_VERSION`, `CONFLICT_PROJECT_VERSION`, `CONFLICT_PROJECT_UNIT_IDENTIFIER`, `PERMISSION_*`, `AUTH_*`, and `FEATURE_*` separately. On conflict reload effective values and provenance. Keep the draft intact and map each server blocker to the field dictionary. See [the field appendix](03-canonical-field-dictionary.md) for every key and visibility/inheritance rule.


## Shared contract references

Contract cross-reference: property/project/unit response shapes and effective-value DTOs are in [15-api-dto-and-schema-reference.md](15-api-dto-and-schema-reference.md); state variations are in [16-api-response-variation-matrix.md](16-api-response-variation-matrix.md); create-to-publication workflows are in [17-end-to-end-frontend-workflows.md](17-end-to-end-frontend-workflows.md).
### Project association mutation contract

`PATCH /api/properties/:id/project` attaches or moves an eligible property. Body is `{projectId:string,projectUnit?:{unitName?,unitNumber?,block?,phase?,floor?,plotNumber?},expectedVersion?:integer>=0}`; `projectUnit` values are bounded strings/numbers and are contact-guarded. `DELETE /api/properties/:id/project` detaches and accepts only `{expectedVersion?:integer>=0}`. Both require Bearer, the active owner/editor profile, `listing.edit`, current owner-signatory authority, step-up, and current permission over the property and both old/new project. Success is `{property:<safeProperty DTO>,version}`. Sold/completed listings cannot be reassigned; a changed association clears project-scoped unit type, unpublishes the listing and requires normal readiness/review again. Stale versions return `409 CONFLICT_LISTING_VERSION`; a duplicate project unit number returns `409 CONFLICT_PROJECT_UNIT_IDENTIFIER`. The service updates project counts and invalidates dependent publication/search projections transactionally. Use DELETE, not `PATCH` with `projectId:null`, to detach.

\n