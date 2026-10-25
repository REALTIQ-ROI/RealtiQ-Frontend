# Backend API handoff implementation audit

Audit date: 2026-10-25. Scope: this frontend working tree against `docs/backend-api-handoff/`. The backend repository and a live API were not available. This is a source and local-test audit, not backend acceptance.

## Executive result

**The handoff has not been fully implemented.** The working tree contains substantial, useful first-batch integration, but no whole handoff chapter can be marked complete. Several documented reads and ordinary writes work in the frontend, while sensitive mutations are intentionally disabled because the handoff does not give the exact bound step-up challenge exchange. Other features have sufficient high-level guidance but still need frontend work or endpoint-specific DTO reconciliation. The paid/live tour purchase mismatch is a confirmed backend workflow gap and must remain withheld.

`git status --porcelain=v1 -uall` showed **96 unique uncommitted paths: 93 tracked changes and 3 untracked tests** before this report was added. Twelve paths have both staged and unstaged changes (`MM` or `AM`). Counting those paths twice produces **108 change-layer entries**, which likely explains the reported “108 files”; it does not mean 108 unique files. None of the 18 handoff source files was changed. The existing `FIRST_BATCH_FRONTEND_INTEGRATION_TRACKER.md` is itself an uncommitted addition with later unstaged edits.

Status terms below: **integrated** means code in this working tree or a reused existing service calls the documented contract; **partial** means some operations or response states are handled; **withheld** means the UI deliberately disables an operation pending a concrete contract; **pending review** means no demonstrated integration in these changed files and is not automatically a backend blocker. Local tests cannot prove an operation against the backend.

## Handoff file by file

| Handoff file | Frontend implementation found | Remaining work / boundary |
| --- | --- | --- |
| [README](backend-api-handoff/README.md) | Selected-profile header, endpoint-specific envelopes, request IDs and several documented workflows adopted. | Its integration guidance is only partially met; no live API acceptance. |
| [01 Auth, accounts, profiles](backend-api-handoff/01-auth-accounts-profiles.md) | Account bootstrap, authorized profile list/current/switch, server logout, and selected-profile verification status; existing login/recovery reused. | Second-factor DTO, profile onboarding, protected evidence/cases, organization roster/seats/roles and bound step-up mutations remain absent or withheld. |
| [02 Properties, projects, units](backend-api-handoff/02-properties-projects-units.md) | Property create/edit envelopes, owner list paging, project reads/create, public price history, virtual-tour configuration, staff Featured toggle and selected admin reads corrected. | Full canonical form, readiness/publication, type and unit/grid lifecycle, project edit/archive/status/Featured and listing archive are incomplete or withheld. |
| [03 Canonical field dictionary](backend-api-handoff/03-canonical-field-dictionary.md) | Some form rules corrected: no invented high-price installment requirement, GBP canonical currency, direct Sold edit or guessed payment type. | The 156-field schema, inheritance/provenance, missing/null/zero distinctions and type-specific form lifecycle are not fully implemented. |
| [04 Search, maps, discovery](backend-api-handoff/04-search-maps-discovery.md) | Public catalogue uses server `canonical-v1` query, pagination, normalization notices and all 12 documented sort choices. | Exposed filters are a subset of 66 controls. Map uses catalogue-page properties rather than the canonical map result. URL serialization currently drops unsupported/unknown active criteria; see finding A1. Saved-search/alert workflows are not established by this diff. |
| [05 Imports, grids, bulk](backend-api-handoff/05-imports-grids-bulk-operations.md) | Project import schema/template/upload/list/preview/row edit/cancel and staff import queue/detail/pagination corrected. | Confirm/retry requires missing bound step-up exchange; durable grid, bulk job, undo and publication workflows are not integrated here. |
| [06 Documents, media, verification](backend-api-handoff/06-documents-media-verification.md) | Plural document routes, protected metadata/read paths, owner title submission metadata, safe public-media response and staff title read queue corrected. | Title asset/file writes, staff decisions/anchoring and profile evidence/case workflow are withheld or lack complete DTOs; operational custody console not implemented. |
| [07 Payments, ownership, escrow](backend-api-handoff/07-payments-ownership-escrow.md) | Ordinary viewing request/list/status, existing cart and checkout reads, payment reads/verification, staff checkout/dispute reads and safe status rendering. | Checkout initialization, outright purchase, allocation retry, payment cancel, escrow resolution/refund and ownership/instalment workflow are not complete. Paid/live tour purchase remains a backend mismatch. No tour cancellation was added. |
| [08 Privacy, notifications, realtime](backend-api-handoff/08-privacy-notifications-realtime.md) | Selected-profile data-protection list/detail/export, notification ID/route fixes, 202/207 digest handling and profile-aware socket lifecycle. | Data-protection create/withdraw, history and execution record outcomes, broader messaging/delivery workflow and account edits remain incomplete or withheld. |
| [09 Admin Console and policies](backend-api-handoff/09-admin-console-and-policies.md) | Staff wallet, escrow, checkout, project, property import, virtual-tour, proxy-inspector and trust-appeal reads corrected; safe evidence rendering and Featured toggle. | Verification-case queue is not integrated; sensitive decisions and policy/retention/location/operational controls remain absent or withheld. |
| [10 Errors and state machines](backend-api-handoff/10-api-errors-and-state-machines.md) | Shared client preserves code, field errors, request ID and retry-after; selected 409, 403, provider and alternate-success states handled. | No universal state-machine coverage or live validation across endpoint families. |
| [11 Frontend checklist](backend-api-handoff/11-frontend-integration-checklist.md) | Many shared-client, property, import, notification and staff-read tasks covered. | Checklist as a whole remains open, especially buyer purchase, organization, grids, verification, policy, and accessibility/runtime acceptance. |
| [12 Configuration gates](backend-api-handoff/12-configuration-gates-and-open-decisions.md) | Several provider/configuration errors surfaced; unconfigured operations are not optimistically treated as success. | Activation-dependent behavior cannot be accepted without runtime configuration and provider tests. |
| [13 Acceptance and contract review](backend-api-handoff/13-backend-acceptance-and-contract-review.md) | Used to withhold the incorrect fixed-price paid/live tour and distinguish documentation gaps from frontend work. | It explicitly reports source-level review rather than runtime acceptance and incomplete per-endpoint contracts. |
| [14 Mounted endpoint index](backend-api-handoff/14-mounted-endpoint-index.md) | Used for route discovery and cross-checking current services. | A mounted registration is not an implemented UI operation or a complete request/response contract. Do not turn index counts into frontend completion percentages. |
| [15 DTO/schema reference](backend-api-handoff/15-api-dto-and-schema-reference.md) | Tour bare DTO, wallet, escrow and protected-document shapes adopted in relevant views. | Other DTO families and type-specific variations remain to be reconciled. |
| [16 Response variation matrix](backend-api-handoff/16-api-response-variation-matrix.md) | Bare tour/wallet responses, media array, property envelope, digest 202/207 and selected errors handled. | Only touched operations are covered; no claim of matrix-wide handling. |
| [17 Workflow playbooks](backend-api-handoff/17-end-to-end-frontend-workflows.md) | Account/profile switch, ordinary viewing, import preview and selected document/notification steps implemented. | End-to-end publication, organization, purchase/ownership, data-rights execution, bulk, staff decision and proxy completion playbooks remain incomplete. |

The handoff [README](backend-api-handoff/README.md) counts 594 mounted registrations and 411 first-batch user/staff registrations. Its exact method/path mention count outside the index is 189/411. These are **documentation coverage figures**, not frontend implementation figures. A route count completion percentage would be misleading because the index contains aliases and operations without full per-endpoint contracts.

## Operation-level implementation map

| Module | Integrated or corrected now | Withheld / still pending |
| --- | --- | --- |
| Identity and app shell | `GET /api/auth/account`, `GET /api/profiles`, `GET /api/profiles/current`, `POST /api/auth/logout`, selected `X-Profile-ID`, protected-route bootstrap and profile switcher; existing auth forms reused. | Second-factor submission and organization/profile authority flows. |
| Public catalogue and listings | `GET /api/properties` with canonical query, page data, sort choices and normalization; `GET /api/properties/:id/price-history` paging/chart; property create/update envelopes and owner `/properties/mine` paging. | Full canonical field set, map pins/clusters, all 66 controls, saved-search integration, listing archive and publication lifecycle. |
| Projects, imports, virtual tours | Owner and staff project reads/paging; project create; provider override; property virtual-tour configuration; import schema/template/upload/preview/row edit/cancel; staff imports and virtual-tour views. | Import confirm/retry, project edit/archive/publish, unit grids/bulk/undo, staff project decisions. |
| Documents and verification | Plural `/api/documents` service calls, title verification submission/read paths, safe public media upload result; selected-profile verification status. | Profile evidence/cases and staff current-case queue, protected title asset/file upload, title decisions/anchoring and private-file operations. |
| Viewings and commerce | Ordinary `POST/GET/PATCH /api/tour`, bare DTO and paging headers; cart/eligibility and checkout reads; payment reads and verification; staff wallet, checkout and escrow-dispute reads. | Cart checkout initialization, direct purchase, paid/live tour, allocation retry, payment cancellation, dispute decision/refund, ownership completion. |
| Privacy, messages, staff | Data-protection list/detail/export; notification list/read/archive/preferences; digest 202/207; profile-aware socket; staff proxy/trust read screens and evidence masking. | Data-protection create/withdraw/history/execution; full messaging/delivery flows; proxy/trust decisions; verification cases; broad Admin Console policy operations. |

## Audit findings and genuine blockers

**A1 — Catalogue URL criteria can be lost when filters or map viewport change (high).** `readCatalogueQuery` forwards all URL keys to the server, but `writeCatalogueQuery` only serializes a fixed 15-key list. `Listings` calls the serializer when applying filters and changing viewport. An active canonical criterion outside that list can disappear from the URL and next request, potentially broadening results. The tracker currently claims unknown URL criteria are preserved; that claim is inaccurate. This is a **frontend defect**, not a backend documentation blocker. See `src/utils/catalogueQuery.ts` and `src/pages/public/Listings.tsx`.

**A2 — Canonical map and full search are incomplete (medium).** The map page renders the current 10-row catalogue page; it does not consume the handoff's `GET /api/properties/map` response with map pins/clusters and shared total/facets. The existing `getMapProperties` type still models a separate legacy `mode` union. The exposed filter panel is a subset of the documented 66 controls. This is pending frontend reconciliation, with the precise map DTO called out as a handoff gap.

**A3 — Privacy request detail omits documented history and execution (medium).** The new view calls list/detail/export and displays result codes, but does not call `/:id/history` or `/:id/execution`. Its copy says record outcomes determine what happened while those outcomes are not shown. Creation and withdrawal are separately withheld by step-up. This is partial frontend implementation.

**A4 — Full listing/project lifecycle is not present (medium).** Forms still expose a partial legacy field set rather than the 156 canonical fields and inherited provenance. Project publication, unit grid/bulk, readiness and several state transitions are absent. The project/service corrections make supported reads and ordinary create/edit safer; they do not complete these workflows. Do not mark these entire chapters implemented.

**B1 — Bound step-up exchange remains a genuine cross-module contract blocker.** The handoff identifies `POST /api/auth/step-up`, `POST /api/auth/step-up/:id/verify` and `X-Step-Up-Challenge`, but describes the factor/challenge request DTO as controller-defined. The backend controller is unavailable and no established frontend implementation was found. Exact method/path/profile/body/file-digest binding makes guessing unsafe. Only affected sensitive operations are withheld: checkout, account/privacy edits, protected evidence/title upload, import confirm/retry, archive/project edits/status, payment/escrow decisions, staff verification/proxy/trust decisions and allocation retry. This blocker does **not** apply to the ordinary reads/writes already integrated.

**B2 — Current verification case DTO and protected evidence submission are incomplete.** The staff KYC page is now a static unavailable state rather than a wired `GET /api/admin/verification-cases` queue. The handoff does not supply a current-case list/detail/evidence DTO or complete allowed evidence/case submission fields. The old user-directory/public-media path was removed. Status read is usable; this specific workflow is blocked.

**B3 — Paid/live viewing is a confirmed backend workflow mismatch.** The mounted paid route's fixed-price Paystack behavior does not implement the source-defined seller-free launch/partner-terms flow. The frontend has correctly withheld that purchase branch. Ordinary tours remain integrated, and no unsupported cancellation was introduced.

**B4 — Checkout initialization and project publication need endpoint-specific contracts.** The cart checkout body/idempotency details and publication transition request are not complete in the handoff; the former also requires a bound challenge. The previous guessed `/payments/initialize {propertyId}` and generic project `{publish:true}` paths were removed. Cart history and project management reads remain available.

**A5 — Staff dashboard/Featured counts are scoped previews.** Their source is a loaded public catalogue slice, not complete staff inventory. Labels were corrected, but these screens cannot be treated as globally complete operational totals. `PropertiesContext` still defaults to a single public catalogue request with `limit=500`.

**A6 — One unchanged test fixture uses the old property update response (low).** The full suite's only failure is `src/services/propertyMarketService.test.ts` expecting a bare property from `PATCH /api/properties/:id`. The handoff specifies `{property,version,...}` and the changed service now consumes `data.property`. The mock supplies a bare property, so `normalizeProperty(undefined)` throws. This is a stale test fixture relative to the documented contract; it does not prove a runtime backend failure. The catalogue query tests also check unknown-key reading but omit the write/Apply Filters path that produces A1.

The letters distinguish **A** frontend implementation findings from **B** contract/backend blockers. Some operations are simply **pending review**, not blocked; the tracker should not label all unimplemented handoff routes as backend gaps.

## Verification and limits

- `npm run build`: passed (TypeScript and Vite production build).
- `git diff HEAD --check`: passed for tracked changes. Git emitted local ignore/line-ending warnings, not whitespace errors.
- Full `npm test -- --run`: **304 passed, 1 failed across 86 files**. The failing unchanged test is `propertyMarketService.test.ts` as explained in A6. The first sandbox attempt failed before running tests with Node `EPERM` on `C:\Users\DELL`; the permitted rerun produced the results above.
- Existing tracker records prior focused passing tests. This audit did not accept those as backend runtime evidence.
- No backend repository, configured providers, live API, or browser end-to-end acceptance was available. Permission/configuration branches identified here are based on code and handoff contracts.

## Uncommitted file inventory

The following is the exact 96-path `git status --short` baseline inspected before this audit report was added. `M ` means staged modification, ` M` unstaged modification, `MM` staged and unstaged modification, `AM` staged addition then unstaged modification, `A ` staged addition, ` D` unstaged deletion and `??` untracked. Grouped module analysis above covers these paths; tests and types are counted as supporting changes, not separate backend operations.

```text
AM docs/FIRST_BATCH_FRONTEND_INTEGRATION_TRACKER.md
M  src/components/layout/AdminLayout.tsx
M  src/components/layout/BuyerPortalLayout.tsx
M  src/components/layout/LandlordPortalLayout.tsx
A  src/components/layout/ProfileSwitcher.tsx
AM src/components/profile/DataProtectionRequests.tsx
MM src/components/project/ProjectForm.tsx
 M src/components/property/MediaUploader.tsx
 M src/components/property/PriceHistorySection.tsx
M  src/components/property/PropertyFiltersPanel.tsx
M  src/components/property/PropertyForm.paymentTypes.test.tsx
M  src/components/property/PropertyForm.tsx
M  src/components/title/TitleDocumentManagement.tsx
 M src/components/virtualTour/VirtualTourManagement.test.tsx
 M src/components/virtualTour/VirtualTourManagement.tsx
M  src/contexts/AuthContext.tsx
M  src/contexts/PropertiesContext.tsx
M  src/contexts/RealtimeContext.tsx
M  src/hooks/useAsync.ts
M  src/hooks/useProperties.ts
A  src/lib/axios.test.ts
M  src/lib/axios.ts
 M src/pages/dashboard/Admin/AdminDashboard.tsx
M  src/pages/dashboard/Admin/AdminEscrowDisputeDetails.test.tsx
M  src/pages/dashboard/Admin/AdminEscrowDisputeDetails.tsx
M  src/pages/dashboard/Admin/AdminEscrowDisputes.tsx
 M src/pages/dashboard/Admin/AdminPaymentDetails.tsx
M  src/pages/dashboard/Admin/AdminPropertyDetails.tsx
 M src/pages/dashboard/Admin/AdminVirtualTours.tsx
M  src/pages/dashboard/Admin/AdminWallet.tsx
 M src/pages/dashboard/Admin/CartCheckoutDetail.tsx
 M src/pages/dashboard/Admin/CartCheckouts.tsx
MM src/pages/dashboard/Admin/FeaturedListings.tsx
 M src/pages/dashboard/Admin/KycManagement.tsx
 M src/pages/dashboard/Admin/ManagePayments.test.tsx
 M src/pages/dashboard/Admin/ManagePayments.tsx
M  src/pages/dashboard/Admin/ManageProperties.tsx
 M src/pages/dashboard/Admin/ProjectDetails.tsx
 M src/pages/dashboard/Admin/Projects.tsx
 M src/pages/dashboard/Admin/PropertyImports.tsx
MM src/pages/dashboard/Admin/TitleVerificationReview.test.tsx
M  src/pages/dashboard/Admin/TitleVerificationReview.tsx
 M src/pages/dashboard/Admin/TrustAppeals.tsx
M  src/pages/dashboard/Buyer/ProfileSettings.tsx
M  src/pages/dashboard/Buyer/ServiceCart.tsx
M  src/pages/dashboard/Landlord/Editproperty.tsx
M  src/pages/dashboard/Landlord/LandlordMyProperties.tsx
 M src/pages/dashboard/Landlord/LandlordPropertyDetails.tsx
M  src/pages/dashboard/Landlord/LandlordSettings.tsx
M  src/pages/dashboard/Landlord/LandlordTitleVerifications.test.tsx
M  src/pages/dashboard/Landlord/LandlordTitleVerifications.tsx
 M src/pages/dashboard/Landlord/LandlordVerification.tsx
M  src/pages/dashboard/Landlord/ProjectEditor.tsx
MM src/pages/dashboard/Landlord/ProjectManage.tsx
M  src/pages/dashboard/Landlord/ProjectPropertyImports.tsx
MM src/pages/dashboard/Landlord/Projects.tsx
 M src/pages/dashboard/NotificationDigest.tsx
M  src/pages/dashboard/Notifications.test.ts
M  src/pages/dashboard/Notifications.tsx
M  src/pages/dashboard/Tours.tsx
 M src/pages/proxyNetwork/AdminInspectors.tsx
MM src/pages/public/Checkout.paymentTypes.test.tsx
M  src/pages/public/Checkout.tsx
M  src/pages/public/Listings.tsx
M  src/pages/public/PropertyDetails.escrowGuest.test.tsx
M  src/pages/public/PropertyDetails.tsx
M  src/routes/ProtectedRoute.tsx
M  src/services/authService.ts
AM src/services/dataProtectionService.ts
M  src/services/documentService.ts
 M src/services/notificationService.ts
 M src/services/paymentService.ts
A  src/services/profileService.test.ts
A  src/services/profileService.ts
 M src/services/projectService.test.ts
MM src/services/projectService.ts
M  src/services/propertyService.paymentTypes.test.ts
MM src/services/propertyService.ts
M  src/services/titleDocumentService.ts
A  src/services/tourService.test.ts
M  src/services/tourService.ts
 D src/services/verificationService.ts
MM src/services/virtualTourService.ts
M  src/types/escrow.ts
M  src/types/index.ts
M  src/types/phase2.ts
 M src/types/virtualTour.ts
A  src/utils/catalogueQuery.test.ts
A  src/utils/catalogueQuery.ts
M  src/utils/notificationVisibility.ts
M  src/utils/projectImport.ts
M  src/utils/propertyPaymentTypes.test.ts
M  src/utils/propertyPaymentTypes.ts
?? src/components/property/PriceHistorySection.test.tsx
?? src/pages/dashboard/Admin/AdminVirtualTours.test.tsx
?? src/pages/dashboard/Admin/ProjectDetails.test.tsx
```
