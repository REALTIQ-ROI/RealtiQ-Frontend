# Pass 11 — Frontend integration checklist coverage

## Scope and method

This report follows the checklist headings and item order in Chapter 11. The initial status records the source/UI state before Pass 11 changes; the final status records the state after this pass. “Source verified” means the local frontend source and focused tests support the claim. It does not mean the backend was contacted or production behavior was accepted.

Status key: C = COMPLETE — SOURCE VERIFIED; P = PARTIAL — FRONTEND WORK REMAINING; NI = NOT IMPLEMENTED; BC = BLOCKED — BACKEND CONTRACT; BP = BLOCKED — PRODUCT DECISION; BG = BLOCKED — CONFIGURATION; BS = BLOCKED — MISSING SPECIFICATION; NA = NOT APPLICABLE.

## A. Checklist coverage

The checklist contains 62 items. Item numbers preserve the source order across its original section headings.

| # | Chapter 11 requirement | Initial | Final | Source evidence / remaining limitation |
|---:|---|---|---|---|
| 1 | Typed client adds bearer and active X-Profile-ID | C | C | Axios request interceptors use AuthContext/session and active profile. |
| 2 | Preserve request ID and normalize documented error envelopes/status classes | C | C | Axios parses message/code, validation details, request ID and retry metadata; focused Axios tests exist. |
| 3 | Keep private responses out of shared/browser caches across profile/session changes | C | C | No persisted query cache for private payloads; profile/session lifecycle clears private state. |
| 4 | Profile switch/logout/suspension clears data, stops sockets and reloads context | C | C | AuthContext and RealtimeContext profile epoch and cleanup are source-tested. |
| 5 | UI checks returned permissions; server 401/403 remains authoritative | C | C | Current profile permissions gate supported controls; API failures remain visible and 403 does not implicitly log out. |
| 6 | Bind step-up to final method/path/profile/body/file digest | C | C | Shared JSON and byte-bound upload helpers freeze the request; the exact route-specific limitations are in the blocker section. |
| 7 | Registration, email, login/MFA, reset, sessions and logout | P | P | Connected auth journeys exist. The login response’s MFA challenge discriminator is absent from the contract, so the frontend cannot decide when to present the second-factor form. |
| 8 | Load account, profiles and current profile before protected navigation | C | C | Auth bootstrap loads account/profile/current context before protected route content. |
| 9 | Organization invitations, members, roles, seats, mandates, signatories, payout and verification | P | P | Roster, invitation and applicant signatory paths are connected. Seat plan fields, payout bank directory, mandate action enum/custom role lifecycle and staff signatory queue read remain unavailable. |
| 10 | Verification upload state, quarantine/review and evidence replacement | P | P | Profile/title evidence uses protected upload and status flows. Listing/staff verification schemas and some replacement/custody operations remain incomplete or configuration-gated. |
| 11 | Canonical catalogue search, supported URL filters and 12 sorts | C | C | Listings uses canonical query normalization, URL-preserving criteria and documented sort values. |
| 12 | Keep catalogue/map/group/facet counts synchronized; never client-filter private fields | P | P | List and map use canonical server queries and server projections, but separate response DTOs do not provide one shared count/facet envelope for every view. |
| 13 | Favorites, following, saved-search CRUD and alert preferences/status | P | P | Favorites, persisted saved-search CRUD, revision conflict review and alert settings are connected. Following routes appear in the endpoint index, but the local contract omits their request/response DTOs and no following UI is exposed. |
| 14 | Show public title and listing-verification signals distinctly | C | C | Public projections/cards keep declared title separate from verified-title/listing status. |
| 15 | Inquiry/tour, messaging and attachments use active profile/API authorization | P | P | Inquiry, supported tour and messaging calls use authenticated profile context. Attachment workflow is not complete for all documented/private attachment cases; paid/live tour purchase remains disabled. |
| 16 | Cart eligibility, protected checkout, provider pending and status refresh | C | C | Buyer cart checks server eligibility, uses bound step-up, preserves attempt refs and exposes pending/unknown recovery without duplicate initialization. |
| 17 | Ownership and protected title access use current-version grant/viewer flow | P | P | Protected title viewer is connected. Ownership detail/history projections and transfer semantics remain incomplete; payment is not presented as legal ownership. |
| 18 | Create/edit/draft property, project, type and unit | P | C | Existing owner forms/grid plus the new versioned property-to-project association panel complete the connected owner path where contracts exist. Unit-type CRUD limits are listed below. |
| 19 | Preserve unset/null/false/zero/POA/currency/private reserve semantics | C | C | Canonical field/value serializers and forms preserve explicit values and avoid exposing owner reserve fields publicly. |
| 20 | Display inherited value and source/provenance where the DTO supplies it; send explicit overrides/reset only as supported | P | P | Effective values and provenance are shown where returned; some workflow-owned fields and entity-specific override details remain unavailable.
| 21 | Show server readiness blockers, title/ownership/verification holds, duplicate review, sold/relisting rules and freshness state | P | P | Readiness/holds are rendered where supplied. Duplicate/distress review DTOs and some title/ownership/freshness projections remain absent.
| 22 | Publish only through server action/readiness, not draft-save inference | C | C | Project publication uses server action, expected version and bound step-up; server response/readiness is authoritative. |
| 23 | Separate public-media and protected-document upload/association routes | C | C | Media and protected title/evidence services remain separate; private content uses authorized viewer flows. Per-item entitlement changes are not exposed. |
| 24 | Configure site-plan markers only with policy, approved plan and stable identity | BG | BG | UI remains gated when coordinate policy/master plan/identity inputs are unavailable; no synthetic coordinates or IDs are generated. |
| 25 | Paginated owner lists, project management and selected-unit lists | C | C | Landlord property/project pages and unit grid use paginated private management APIs. |
| 26 | Use expectedVersion for edits, publication, availability, price, profile and document mutations | C | C | Versioned service/UI flows use server versions; remaining blocked operations do not fabricate a version. |
| 27 | Render asking-price history; protect reserve/private price | C | C | Price history is server sourced and owner reserve is not included in public projections. |
| 28 | Duplicate candidates/link proposals and reviewed transfer-proof flow | NI | BS | No safe review UI can be wired: duplicate/link and transfer-proof DTO/state rules are not fully specified. No auto-merge was added. |
| 29 | Preserve sold/history-protected units and source-defined relisting | P | P | Sold-history checks and ordinary supported states are preserved. Ownership transfer/buyer-of-record/reviewed proof rules are not sufficiently specified for the complete relisting journey. |
| 30 | Implement filter atoms F01–F66 and exact documented sort table | C | C | Canonical filter panel/query utilities use documented controls and aliases; gated inputs retain criteria when unavailable. |
| 31 | Serialize location IDs/parents/bounds/radius only when data/settings exist | C | C | Location suggestions use parent IDs; map bounds are complete; radius/commute are configuration-gated without fabricated IDs. |
| 32 | Handle 503 without dropping filters or broadening results | C | C | Search preserves URL criteria and displays specific unavailable notices. |
| 33 | Show Recommended fallback notice when authoritative ranking inputs are absent | C | C | Server notice is rendered; client does not invent a score. |
| 34 | Distinguish sponsored, platform/title verification, freshness, advertiser and Featured | C | C | Result cards render distinct server-backed labels; Featured is not treated as Sponsored entitlement. |
| 35 | Keep map/list query and effective unit criteria aligned | C | C | Map requests use canonical query version, active bounds and shared search criteria; pins/clusters are server results, independent of current list page. |
| 36 | Download template/schema and upload CSV/XLSX using browser multipart boundary | C | C | Import screen loads schema/template and leaves multipart boundary generation to the browser. |
| 37 | Show row errors/readiness, edit rows and explicitly confirm unit-type decisions | P | P | Row correction/removal/restore and server preview work. Exact existing-unit update and new-unit-type confirmation bodies are absent, so those decisions cannot be safely enabled. |
| 38 | Poll jobs, show partial results, retry/cancel safely and retain committed rows | C | C | Durable import/grid status is polled with bounded refresh; ambiguous writes require status inspection; committed rows remain explicit. |
| 39 | Use server undo eligibility/expiry and exclude irreversible transitions | C | C | Grid reads undoAvailable/undoExpiresAt from operation/job responses and binds undo; absence of expiry is not converted into a guessed cutoff. |
| 40 | Refresh project/grid/search/public data after canonical changes | C | C | Grid mutations refresh project/grid state; management and discovery read server records on navigation/refresh; no persisted shared private cache is used. |
| 41 | Separate public media from private documents and use protected viewer sessions | C | C | Authorized private-content services reject external/provider URLs and do not place bytes in persistent browser storage. |
| 42 | Show upload progress/quarantine/review/version/grant/access receipt | P | P | Upload and status states exist for connected evidence/title flows; not every grant, access receipt, listing verification and staff custody projection has a complete UI. |
| 43 | Access/correction/deletion requests, history, grouped outcomes and private export | P | P | Access/deletion and grouped execution are connected. Correction/withdrawal, general consent history and some staff decision/export projections remain incomplete. |
| 44 | Explain held/retained records as partial completion | C | C | Privacy detail shows grouped held/preserved/blocked outcomes and does not fabricate individual rows or promise deletion. |
| 45 | Stateful buyer cart/checkout, payment history, installments and escrow | C | C | Buyer and owner screens use authoritative backend records and pending/unknown states. Participant escrow mutation coverage is limited to documented connected paths. |
| 46 | Require backend confirmation before settlement/purchase/ownership state | C | C | Provider redirects are not treated as payment proof; ownership is sourced from ownership APIs. |
| 47 | Reload payout setup and signatory state before payout | P | P | Existing payout/signatory reads are used where available. Seat-plan fields and bank directory/complete authority projections block full setup. |
| 48 | Show provider unavailable/reconciliation and retry only per server idempotency | C | C | Unknown attempts preserve references and reconcile before another attempt; paid tours map FEATURE_PAID_TOUR_UNAVAILABLE to a stable disabled state. |
| 49 | Current-profile notification list/preferences/devices/read/archive | P | P | Profile-scoped list/preferences/read operations are connected. Device registration/projection is not complete; mandatory categories remain server-authoritative. |
| 50 | Authenticate sockets with current token/profile and reauthenticate after changes | C | C | Shared Socket.IO client binds profile/session epoch and disconnects/rejoins on auth/profile changes. |
| 51 | Treat events as hints and refresh REST history after reconnect | C | C | RealtimeContext performs REST reconciliation after connection readiness/reconnect. |
| 52 | Keep sensitive data out of frontend telemetry | C | C | No raw KYC/reserve/attachment/provider payload telemetry is wired in the inspected integration paths. |
| 53 | Only expose approved staff screens and preserve read-only/audit separation | P | P | Protected admin route tree and server authorization are present; navigation is not fully capability-projected per department, and some queues are contract-blocked. |
| 54 | Build verification/duplicate/listing accuracy/legal hold/data-rights/delivery/policy/gazetteer queues | P | P | KYC/title, legal hold, privacy execution and delivery are reachable. Duplicate/distress/listing-accuracy and some policy/gazetteer projections/actions remain missing or schema-blocked. |
| 55 | Require step-up and independent-review constraints | C | C | Implemented protected staff actions use shared bound step-up and render separation-of-duties constraints; unsupported bodyless binding/actions stay disabled. |
| 56 | Retrieve raw evidence only through authorized private-content endpoints | C | C | Protected viewer/content APIs are used; public URLs are not substituted. |
| 57 | Keep Featured separate from Sponsored placement | C | C | Admin and public views distinguish editorial featured status and sponsored entitlement. |
| 58 | Give every 202/partial response a visible progress state and safe exit | C | C | Import, grid, privacy and checkout asynchronous states are surfaced with bounded polling/manual refresh. |
| 59 | Explain every 409 and offer reload/compare | P | P | Important versioned forms/jobs provide refresh/review. This behavior is not universal across every endpoint-specific conflict screen. |
| 60 | Preserve input and explain the unavailable capability for every 503 | P | P | Search and payment gates have specific recovery text; no complete application-wide audit can verify every endpoint/form preserves drafts. |
| 61 | Derive file limits/MIME guidance from contract/configuration | P | P | Evidence/import controls use available documented policies. Listing-verification and some title/custody upload policy/limit projections remain incomplete. |
| 62 | Keyboard/screen reader identifies blockers/errors/progress/permission denial | P | P | Existing semantic labels, alerts and status regions are used, including new owner association and payment controls. A full application-wide assistive-technology audit remains outstanding. |

### Initial and final summary

The initial source audit found the shared API/session/step-up foundation and most first-batch feature modules already integrated. The principal frontend-owned gaps addressed in this pass were the absent owner property/project association UI, an admin payment detail screen that contradicted the documented cancellation contract, and five real hook-dependency warnings. Several checklist requirements aggregate multiple operations and therefore remain PARTIAL even though their supported subflows are complete.

The new association flow moves checklist item 18 from PARTIAL to COMPLETE at source/UI level and updates reconciliation item B02-01. The admin payment detail correction closes a route-level inconsistency; it does not change the broader Pass 07 verdict or claim live authorization acceptance. No other prior pass verdict is rewritten.

## B. Route coverage

Source: src/routes/AppRoutes.tsx. The following is a route-family map, not a claim that each route was live-tested.

| Route family | Routes / representative patterns | Status |
|---|---|---|
| Public discovery | /, /properties, /projects, /projects/map, /projects/:slug, /projects/:slug/properties, /properties/:id, /properties/:id/price-history | COMPLETE for documented search/detail reads; saved-follow and some ownership/transfer journeys remain separately limited. |
| Authentication | /login, /register, /verify-email/:token, /forgot-password, /reset-password/:token, /auth/landlord/login, /auth/landlord/register, /account/security | PARTIAL because initial-login MFA challenge response is unspecified. |
| Profile-scoped shared | /dashboard, /dashboard/organization, /dashboard/personalisation, /dashboard/notifications, /messages, /messages/:conversationId | PARTIAL: profile isolation and supported CRUD exist; follows DTO, attachments and some preference/history variants remain incomplete. |
| Buyer | /dashboard/buyer and cart, checkout history/detail, payment history/detail, installments, escrows, inquiry history, personalisation | COMPLETE for connected checkout/reconciliation and reads; ownership detail/history/transfer remain limited by missing projections/specification. |
| Landlord/developer | /dashboard/landlord, /my-properties, /projects, /projects/new, /projects/:id, /projects/:id/edit, /projects/:id/imports[/:importId], add/edit property, property detail, verification, title verification, escrow/installments | COMPLETE for supported create/edit/grid/import/publication paths; association now added to owner edit. Import explicit decision bodies and some verification/media workflows remain blocked. |
| Staff/admin | /dashboard/admin, users, properties/review, projects, imports, payments/detail, checkout/detail, KYC, title verification, privacy execution, legal holds, staff access, notification delivery, moderation, trust appeals, escrows/disputes, settings/tours, wallet | PARTIAL: supported documented operations are connected; duplicate/distress/listing-accuracy queues, some policy/gazetteer projections and some staff decisions remain unavailable. |
| Protected public content | /protected-title-viewer, /title-verification/:publicVerificationId | COMPLETE for the documented protected viewer/public registry boundary; not every title-asset custody operation has a screen. |

## C. Service coverage

| Area | Source files / service families | Status |
|---|---|---|
| HTTP/session/profile | src/lib/axios.ts, AuthContext, ProfileSwitcher, profileService, authService | COMPLETE for documented bearer/profile/error lifecycle; initial MFA discriminator remains blocked. |
| Shared bound TOTP | useBoundStepUp, StepUpDialog, JSON and title byte-binding helpers | COMPLETE for implemented operations; unsupported/no-body routes remain disabled. |
| Property/project/canonical | propertyService, projectService, canonicalFieldRegistry, canonicalCatalogueService, unit-grid services | COMPLETE for connected request/response contracts; individual-media entitlement, duplicate decisions and a few entity DTOs remain limited. |
| Search/personalisation | catalogue/map/location/personalisation services and Listings/Personalisation pages | PARTIAL only for following DTO/UI and cross-response count synchronization; saved search revisions and conflicts are connected. |
| Import/jobs | projectService import/job methods, ProjectPropertyImports, UnitGridPanel | PARTIAL for explicit existing-unit/new-type decisions; mapping, correction, polling, partial outcomes, cancel and undo metadata are connected. |
| Documents/verification | document/title/evidence/verificationCase services and owner/staff views | PARTIAL for listing/staff schemas and broader custody/grant operations; connected uploads use byte-bound step-up. |
| Payments/ownership/escrow | cart/payment/installment/escrow/ownership services and buyer/admin/owner pages | PARTIAL for ownership history/transfer and remaining participant escrow contracts; unknown payment outcomes and protected export are connected. |
| Privacy/notifications/realtime | privacy/notification/messaging services, RealtimeContext | PARTIAL for correction/withdrawal/consent history, devices and attachment/delivery projections; profile-scoped REST reconciliation is source-tested. |
| Administration | admin policy, staff, privacy, payment, verification, trust, legal-hold and notification-delivery services | PARTIAL; the implemented UI is route-protected and step-up-bound as required, but several queue/read DTOs and revision schemas remain unspecified. |

The source search found no imports of src/services/mockStore.ts and no inspected page using it as its data source. This is a static finding, not a runtime guarantee. The broader route inventory contains forms that remain configuration- or contract-gated; no disconnected endpoint wrapper was counted as a complete journey.

## D. User journeys

| Journey | Entry route / role | Supported frontend steps | Remaining step / status |
|---|---|---|---|
| A — Account onboarding | /register → /login → profile switcher → /dashboard; registered user | Register, email verification, login, restore account/profile, select active profile, protected navigation and logout are connected. | Initial-login MFA challenge discriminator is absent. PARTIAL. |
| B — Property publication | /dashboard/landlord/add-property or /dashboard/landlord/edit-property/:id; owner/editor | Create draft, canonical edit, media, project association (PATCH/DELETE with version + bound TOTP), readiness refresh and supported publication action. | Some verification/readiness dependencies are policy/configuration-gated. COMPLETE for supported owner route; live acceptance not run. |
| C — Project and unit management | /dashboard/landlord/projects → /:id; developer | Create/edit project, configure documented types, use unit grid, read effective provenance, run jobs, inspect readiness and publish through version-bound action. | Explicit import type confirmation request DTO and unresolved product enum/entitlement details remain. PARTIAL. |
| D — Search and saved discovery | /properties; visitor/registered profile | Search, canonical filters/sort/map, detail, URL restore, save/reopen/edit/delete, revision conflict review and supported alert settings. | Following management DTO/UI and one-response count synchronization are incomplete; external alert channels depend on configuration. PARTIAL. |
| E — Import | /dashboard/landlord/projects/:id/imports; project editor | Download schema/template, upload, map columns, preview/edit/remove/restore rows, confirm import, poll, cancel, inspect partial results and retry eligible failures. | Explicit existing-unit update/new-unit-type confirmation request body and complete row decision journey are not specified. PARTIAL. |
| F — Verification | /dashboard/landlord/settings/verification and title-verification; holder/staff | Read policies, upload byte-bound evidence, submit supported holder case, view status/history, review staff case and use policy-bound checks. | Listing/staff queue schemas and approved policy/storage/scanning availability gate some completion/approval steps. PARTIAL. |
| G — Payment | Property detail or buyer cart; buyer | Check eligibility, bind step-up, preserve attempt, redirect, verify through backend, inspect pending/unknown and refresh authoritative payment/ownership data. | Provider config/unique-index rollout and ownership transfer/history specs remain. PARTIAL as full financial/ownership journey. |
| H — Messaging | /messages/:conversationId; authorized profiles | Load REST history, send through profile-scoped service, update from Socket.IO and reconcile REST after reconnect. | Some attachment DTO/permissions and delivery/read receipt projection remain unavailable. PARTIAL. |
| I — Privacy | /dashboard/notifications/privacy or documented privacy entry; profile holder/staff | Submit supported access/deletion request, preserve ID, view history/execution/grouped outcomes and legal holds. | Correction/withdrawal variants, general consent history and staff decision fields are incomplete. PARTIAL. |
| J — Administration | /dashboard/admin/*; authorized staff | Open supported queues/details, perform documented bound/versioned actions, see returned state/history; pending payment cancellation now also works on detail route. | Duplicate/distress/listing-accuracy queues, some policy/gazetteer DTOs and staff decision projections remain blocked. PARTIAL. |

## E. Frontend-owned gaps closed in Pass 11

1. **Owner property/project association:** added PropertyProjectAssociation to the existing owner edit screen. It lists projects using the current active profile, preserves project-unit identifiers, sends only documented fields and expectedVersion, uses the shared challenge flow for the exact PATCH/DELETE route, confirms consequential association changes, prevents sold/history-protected changes, and reloads the server property after success/conflict. Duplicate projectService methods now delegate to the property service instead of retaining a divergent payload/header implementation.
2. **Admin payment detail cancellation:** replaced stale disabled copy with the documented pending-payment cancellation action. The UI binds PATCH path/body to a fresh TOTP challenge, limits the optional reason to the contract bound, consumes the returned payment DTO, and offers refresh after failure. Route changes discard an open challenge and stale reads cannot overwrite the next payment. It does not label cancellation as refund or payment success.
3. **Five hook dependency warnings:** corrected dependencies/derived keys in EscrowDetails, LandlordVerification, OrganizationManagement and PropertyDetails. The fixes prevent stale escrow/profile/payment closures and avoid an unstable permission fallback dependency.
4. **Stale admin copy:** ManageProperties no longer says the owner archive action lacks a step-up contract; the staff page now accurately states that staff archive is not exposed there.

### Revisit of the 15 prior PARTIAL reconciliation items

| Blocker | Pass 11 result | Frontend-owned work or remaining dependency |
|---|---|---|
| B07-01 | PARTIAL | Connected participant escrow paths were source-checked; unconnected legacy operations still lack route-specific request/state detail. |
| B06-01 | PARTIAL | Existing property-scoped byte-bound title upload was verified; remaining title-asset/survey and staff custody operations need separate UI/contracts. |
| B01-01 | PARTIAL | Second-factor service exists; initial login response discriminator still missing. |
| B01-03 | PARTIAL | Roster, invites and applicant signatory are connected; role/mandate action details, seat/payout schemas and staff signatory read route remain incomplete. |
| B05-01 | PARTIAL | Strict column mapping and row correction are connected; existing-unit and new-unit-type confirmation bodies remain unspecified. |
| B06-02 | PARTIAL | Holder case submission and staff review are connected; listing verification schemas and approved company manual-source policy/config remain gates. |
| B08-01 | PARTIAL | Access/deletion and supported correction paths were checked; withdrawal/general consent history/staff decision DTOs remain incomplete. |
| B09-VER-01 | PARTIAL | Required checks and approved manual sources are used; approval stays unavailable without the active approved policy and independent reviewer. |
| B09-02 | PARTIAL | Safe account list/detail and supported edits/deletion exist; status mutation needs the staff authVersion/status projection. |
| B09-04 | PARTIAL | Existing property/project reviews are connected; duplicate/distress/listing-accuracy queue and decision projections remain incomplete. |
| B09-05 | PARTIAL | Versioned trust-appeal resolution is connected; bodyless recompute cannot be safely bound until the challenge representation is specified. |
| B09-06 | PARTIAL | Read-only company policy projection exists. Generic per-policy schemas and gazetteer status/revision projections are incomplete; arbitrary JSON editing or invented response fields would be unsafe. |
| B01-06 | PARTIAL | Supported phone challenge/history paths exist; alternate email flow and provider delivery remain contract/configuration gaps. |
| B09-08 | PARTIAL | Virtual-tour settings mutation is bound and versioned after a returned version; initial admin revision read and history UI remain incomplete. |
| B02-01 | COMPLETE at frontend source/UI level | Added the owner property-editor association flow using versioned, step-up-bound property-scoped PATCH/DELETE. See the updated row in the reconciliation report. |

This table reconciles the 15 rows that were PARTIAL in the prior 41-blocker summary. It does not recast product decisions, configuration gates or missing specifications as frontend completions.

## F. Contract blockers

- Initial-login MFA: POST /api/auth/login has no documented response discriminator/payload that tells the UI to invoke the documented second-factor endpoint.
- Following list/action: mounted GET/POST/DELETE paths are indexed, but endpoint chapter docs do not give the following DTO/request/response; a usable following manager would require invented shape assumptions.
- Organization: plan item/seat fields and payout bank directory schema are absent; mandate action values/custom-role lifecycle remain incomplete; the signatory staff decision has no staff queue/detail read route.
- Import: PATCH row edit is connected, but confirm-update and confirm-new-type do not document request body fields/version binding, so the explicit decision buttons remain unavailable.
- Verification/privacy: listing verification preflight/requirement and staff queue/detail decision projections are incomplete; some staff privacy decision/version fields and general consent history are unspecified.
- Admin moderation/account: staff account authVersion/status projection and some duplicate/distress/listing-accuracy queue/detail/action DTOs are absent.
- Trust/policy/gazetteer: bodyless trust recompute has no documented bound challenge representation. Policy endpoints have generic revision envelopes but no complete per-key revision schemas/catalogue. Gazetteer status/revision response projections are not sufficiently specified for a trustworthy queue UI; no synthetic data is added.
- Payments/ownership: ownership transfer/history/sales aggregation rules remain missing; some participant escrow mutation states and operations are incomplete.
- Media/build-stage: per-media entitlement mutation semantics are absent; the handoff conflicts on the total construction-milestone count.

## G. Product/specification blockers

- Paid/live tour purchase model is incompatible and remains disabled; FEATURE_PAID_TOUR_UNAVAILABLE is an explicit unavailable feature state.
- Ownership transfer/history and seller sales aggregate definitions are not specified.
- Per-media-item entitlement policy and the 15-versus-16 construction milestone decision remain unresolved.
- Complete platform/admin dashboard metric definitions remain unspecified.

## H. Configuration and deployment gates

- Approved company-verification manualSources and independent staff review policy; TOTP enrollment and staff department/resource permission.
- Private evidence storage, malware scanning, retention, clean status and provider watermark/font where applicable.
- Payment-provider activation and payment-attempt unique-index deployment/reconciliation; payout and seat policy/provider activation.
- Active licensed gazetteer dataset; FX, nearby/commute routing, trust/freshness ranking and saved-search cadence policies.
- Email/SMS/WhatsApp/push delivery providers and notification channel policies.
- Virtual-tour providers and property-level availability.

These gates preserve the affected controls in an unavailable/pending state; they are not treated as successful integration or backend defects.

## I. Hook dependency review

The five prior exhaustive-deps warnings were inspected. The EscrowDetails effect captured a displayed escrow object; LandlordVerification cleanup captured a changing step-up object; OrganizationManagement used a newly allocated fallback permissions array; PropertyDetails keyed a payment effect on route identity but could retain a prior outcome state. The source fixes use the escrow object dependency, a stable cancel function, direct permission derivation, and a property resource key plus state reset. This avoids stale closure/profile/payment display behavior and avoids an effect loop. Edited-file ESLint now passes with zero warnings.

## J. Testing and verification

- Focused Vitest: 8 files / 33 tests passed, exit 0. Includes property-association UI/service coverage, admin payment-detail cancellation and route-change recovery, the updated ManagePayments expectation, adjacent step-up/profile/realtime tests and public property view tests.
- TypeScript no-emit: `tsc -p tsconfig.app.json --noEmit --pretty false`, exit 0.
- Edited-file ESLint: explicit changed TS/TSX files with `--max-warnings 0`, exit 0 and no warnings.
- `git diff --check`: exit 0. Git reported LF-to-CRLF normalization notices only.
- No broad suite/build or live backend acceptance was performed. No real payment, provider call, protected document upload or destructive staff action was executed.

### Files changed in Pass 11

- src/components/property/PropertyProjectAssociation.tsx and src/components/property/PropertyProjectAssociation.test.tsx
- src/pages/dashboard/Landlord/Editproperty.tsx
- src/services/propertyService.ts, src/services/projectService.ts and src/services/propertyService.projectAssociation.test.ts
- src/pages/dashboard/Admin/AdminPaymentDetails.tsx and src/pages/dashboard/Admin/AdminPaymentDetails.test.tsx
- src/pages/dashboard/Admin/ManagePayments.test.tsx and src/pages/dashboard/Admin/ManageProperties.tsx
- src/pages/dashboard/Escrow/EscrowDetails.tsx
- src/pages/dashboard/Landlord/LandlordVerification.tsx
- src/pages/dashboard/OrganizationManagement.tsx
- src/pages/public/PropertyDetails.tsx
- docs/FIRST_BATCH_FRONTEND_INTEGRATION_TRACKER.md
- docs/FRONTEND_RECONCILIATION_POST_BACKEND_REMEDIATION.md
- docs/FRONTEND_INTEGRATION_CHECKLIST_PASS11.md

### Post-Pass 11 source follow-up

Pass 12 subsequently corrected current map/discovery behavior: Mapbox now falls back to the existing Leaflet renderer when the public token is absent; canonical project-map aggregates and `fx_unconfigured` state are validated and shown safely; stale results are hidden while a new map query is pending; and gazetteer-unavailable errors retain their documented code. These are later source changes and do not alter the historical Pass 11 initial/final checklist counts or its PARTIAL verdict. See [Pass 12 configuration readiness](CONFIGURATION_GATES_AND_OPEN_DECISIONS_PASS12.md).

## Overall verdict

**PARTIAL.** The source/UI foundation and most first-batch workflows are connected, and the two Pass 11 frontend-owned gaps above are closed. The Chapter 11 checklist still contains blocked or partial multi-operation journeys whose exact DTO, policy, product decision or deployment setting is absent from the local authoritative handoff. They remain explicit and safely disabled; no missing behavior is inferred.
