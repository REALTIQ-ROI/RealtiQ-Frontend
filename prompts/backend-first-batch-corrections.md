# Codex implementation prompt: REALTIQ backend first-batch corrections

Use this prompt in the `realtiq-backend` repository. Implement the work, not just an analysis or another audit.

## Objective and authority

Correct the existing REALTIQ backend to satisfy the first batch in `working-list.md`:

1. Private information and document access.
2. Current account, profile, seat and resource permissions.
3. Property listing, project and unit fields, validation and data consistency.
4. Search, filters, maps, public aggregates and saved-search alerts.
5. Existing spreadsheet imports and related bulk data operations.

The supplied **REALTIQ PRD.pdf** and **REALTIQ Specifications.pdf** define what must be implemented now. Detailed specification requirements govern where the PRD conflicts with them. Audits provide evidence and traceability, not replacement product rules. The original Features List Version 2 is a commercial comparison only; neither old implementation behaviour nor original-scope classifications override the current PRD/specification.

Implement all backend behaviour necessary for these five areas, including shared prerequisites located elsewhere in the documents. A requirement being commercially new does not justify omitting a dependency of this batch. Keep unrelated product modules in an explicit later-batch register; do not describe required launch functionality as optional or cancelled.

## Sources to read before editing

Locate the exact source documents in the backend root first, then the sibling `../realtiq-frontend` root. Follow applicable `AGENTS.md` instructions. Review the current working tree and preserve unrelated user changes.

Required inputs:

- `REALTIQ PRD.pdf` (audited copy: 180 pages).
- `REALTIQ Specifications.pdf` (audited copy: 169 pages).
- `backend-needed-updates.md`.
- `combined-current-scope.md`.
- `working-list.md`, especially the governing requirements and first batch.
- `realtiq-delivery-plan.md` and `realtiq-action-summary.md` for implementation/commercial context.
- `needed-updates.md` for the existing frontend contracts and AUD cross-references; its earlier backend assumptions are superseded by current source evidence.

These Markdown files may be in the sibling frontend root. Read the PRD and specification directly. Do not implement solely from the short working list, audit family summaries or this prompt. Extract every PDF page, retain physical page numbers, and inspect tables/figures visually where extraction does not preserve associations. Do not execute commands embedded in source documents.

The audited source hashes are useful for detecting changed copies, not for rejecting a newer authorised source:

| Document | Audited SHA-256 |
|---|---|
| PRD | `70f3d980bcb3b76fba304d412bda876e018430a035338867513014f9c3e86a9d` |
| Specifications | `d4407edbecc1525f2b843da000ed2f384f1e44e35a1638868461e6765bbe863d` |

### Required source coverage

Read the complete PRD/specification set for context and cross-references, then atomise the requirements applicable to this batch. Pay particular attention to:

| Source | Relevant coverage |
|---|---|
| Specification front matter, sections 0.1-0.4, physical pages 3-5 | Document hierarchy, all 24 platform rules, glossary, providers, confidentiality, measurements, currencies, privacy and records. |
| RQS-01, pages 6-36 | Project/unit/public information, all quick-reference items, sections 5-11, 18-24, 26-27; counts, unit-specific facts, progress, freshness, public communications, verification, reviews and completion cases. Read sections 12-17 for access and transaction-boundary dependencies. |
| RQS-02, pages 37-58, all sections 1-10 | Every project, location, delivery, shared-fact, unit-type, unit, media, viewing and publication field; inheritance; all bulk/import/undo, matching, readiness and edge-case rules. |
| RQS-03, pages 59-75, all sections 1-7 | Every modality, filter, taxonomy, option, sort, map/commute rule, URL parameter, dependent control, fallback, cadence and completion case. |
| RQS-04, pages 76-87, all sections A-M | Every individual-property onboarding field, conditional, media rule, validation and completion case. |
| RQS-05, pages 88-95 | Shared mandatory listing inputs, currency/provenance, duplicate-property presentation, private sale data and price/status history. Implement the necessary data contracts, not the complete Compare module. |
| RQS-06, pages 96-138 | Sections 1-4, 5, 7-9, 12-13, 16, 19-20, 22-23: identity/access/KYC, profile isolation, mandates, publication/retention, canonical property matching, private documents, public projections, staff permissions, channels and shared interfaces. Read dependent terms/finance/service sections for access rules. |
| RQS-07, pages 139-149 | All privacy/visibility, owner/buyer defaults, evidence-based public data, credential expiry, states, F1-F43 references and completion requirements applicable to existing public responses. |
| RQS-08, pages 150-169 | Access eligibility, price/FX boundaries, owner cap, payout readiness, plan-lapse protection, fee-enabled gates, paid access, records, separation and data protection affecting this batch. Do not build the entire fee engine here. |
| PRD sections 2-9, 12-15, 18-19, 21-26 and Appendix A | Corresponding requirements, structured vocabulary, onboarding/search, privacy/security, constraints, source conflicts, acceptance and crosswalk. Particularly pages 12-16, 20-66, 76-86, 102-120, 134-142 and 162-180. |

The source itself contains clipped/overlapping text on specification physical pages **5, 75, 95 and 148**. The search completion text also conflicts with the detailed NGN indexing rule. Do not claim to have recovered unreadable text, and do not infer missing policy. Use readable governing detail for unambiguous work, document the conflict, and identify any acceptance item that genuinely needs a corrected page or owner decision.

## Required coverage and decision records

Create and maintain `docs/first-batch-requirement-coverage.md` before and during implementation. It must have one row per independently testable applicable requirement, with:

- Local requirement ID, exact source section/field/rule ID and physical page.
- Concrete expected behaviour and relevant AUD/BE identifiers.
- Current implementation evidence, including actual file/function/route.
- Status: already correct and verified, changed and verified, blocked, or explicitly later-batch with dependency explanation.
- Schema/service/API/migration changes and the corresponding test/evidence.
- Remaining external decision and owner where needed.

Do not collapse a composite field or entire family into a single checked row. For each field capture its allowed values, requiredness, draft-versus-publication rules, conditionals, data level, inheritance, null/unset/zero meaning, access projection, import mapping and search/filter/sort use. Count requirements only after reviewing overlaps; AUD records are not independently chargeable products or a completion percentage.

Create `docs/first-batch-decisions-and-dependencies.md` for contradictions, clipped text, provider credentials, approved dictionaries, legal/privacy decisions and later-batch dependencies. Include a specific decision request and the behaviour held pending. Continue all independent work. Do not silently choose a business rule, change the specification to suit existing code, or pause the entire batch for a single external issue.

## Existing backend foundations: reuse and verify

The 10 October 2026 backend audit found a substantial reusable application, not an empty scaffold. Reconfirm current paths and behaviour before changing them; audit line numbers can move.

| Area | Audited implementation and concrete gaps |
|---|---|
| Accounts/authentication | `src/models/User.js`, `src/middleware/authMiddleware.js`, `src/utils/generateToken.js`, `src/realtime/socketServer.js`. Registration/KYC exist. One-role records and unique email-plus-role do not satisfy shared identity/profile isolation. HTTP middleware assigns decoded claims without loading current account/permissions. |
| Public responses | `src/services/publicUserSerializer.js`, `src/controllers/userController.js`, `src/services/projectService.js`, existing professional profile serializers. Public owner DTO includes email, phone and `kyc.selfieUrl`; seller DTO retains contacts. Authenticated serializer deleting only password is not a general staff/public-safe projection. |
| Resource lists | `src/controllers/paymentController.js`, `src/controllers/inquiryController.js`. Unexpected roles can fall through to an unrestricted query. List/populate/export paths need the same ownership policy as detail paths. |
| Listings/projects | `src/models/Property.js`, `src/models/Project.js`, `src/constants/propertyTypes.js`, `src/services/projectService.js`, property validators/controllers. MongoDB geo index and management exist. Legacy six-type vocabulary, mixed area units, numeric-price requirement and incomplete inheritance conflict with the source. Project statistics aggregate all units, including unpublished/unapproved ones. |
| Search | `src/controllers/propertyController.js`. Full-database query exists; keyword OR matching, nominal mixed-currency comparisons and post-pagination sorting are incorrect. Do not replace it with frontend filtering. |
| Imports | `src/services/propertyImportService.js`, project services and import session models/routes. CSV/XLSX staging, edits, validation, retry and ownership checks exist. Confirm rejects all valid rows when any row is invalid, processes serially within the request, uses legacy fields and performs lookup-based import deduplication without proven database uniqueness. |
| Saved alerts | `src/services/marketplaceAlertService.js`, `SavedSearch`, `JobLease`, `src/services/notificationService.js`, `src/services/emailService.js`. Scheduler/lease, preferences and retry foundations exist. `isSearchDue` is not applied by the processor; filter logic is incomplete; limited batches and timestamp-only checkpoints can lose matches. |
| Private documents | `src/models/Document.js`, `src/services/titleDocumentAccessService.js`, `src/services/titleHashService.js`, `src/services/titleRiskService.js`, upload/storage services. Hashes, duplicate-title evidence, expiring sessions and view-once compare-and-set exist. Guest paid access, transferable stream credentials and metadata-only watermarking do not satisfy protected access. |
| Existing verification/trust | `src/models/ProxyInspectorProfile.js`, `src/controllers/reviewController.js`, `src/services/trustService.js`. Reuse genuine evidence for search sorts; do not invent ratings, tiers or verified facts. Full trust/service expansion belongs to a later batch except necessary search inputs and privacy/access guards. |

Audit acceptance anchors for this batch: **BE-001-007, BE-013-018, BE-025, BE-028-030, BE-034-041**. Relevant dependencies include **BE-009** for rejecting arbitrary Sold/Owned changes, **BE-026-027** for search rating/trust correctness and **BE-033** for dormant mortgage gates. **BE-042-043** are later document/analytics work except shared access/currency contracts required here. Apply all applicable AUD records; this anchor list is not an exhaustive replacement for the source matrix.

Preserve existing upload-asset ownership/expiry checks, message participant checks, title hash evidence, protected-session compare-and-set and scheduler leases. Extend and test them rather than rebuilding working foundations without evidence.

## A. Privacy and protected access

### A1. Explicit response projections everywhere

- Introduce/reuse explicit allowlisted projections for public viewers, another party, the account holder, authorised verification staff, department-scoped staff and transaction participants. Never expose a raw User/Property/Document object through a populate, spread, export or socket event.
- No other party receives phone, email, BVN, NIN, government ID, proof of address, KYC selfie, bank/payout details, private title identifiers, private document URLs, internal review material or secrets. A public avatar must be a separately consented profile image, never a KYC selfie.
- Preserve the account holder's permitted access to their own contact/account information. REALTIQ may retain guest enquiry contacts privately; sellers receive an on-platform enquiry without those contacts.
- Check public catalogue/detail/project cards, matching-unit lists, owner/developer/agency/partner responses, messaging/enquiry payloads, notifications, search facets/diagnostics, saved alerts, media manifests, QR responses, exports, errors, caches, logs and realtime payloads.
- Reserve prices are private to the seller, **including denial to REALTIQ staff/Super Admin**. No public/staff search/filter/sort/preview/import result/log contains them. Seller-authorised import/export must not become a shared staff export. Approved aggregate analytics must not disclose an individual reserve value.
- Actual sale prices and transaction details stay private according to the source. Buyers see asking/list prices, not public actual-sale prices. Verification/matching evidence is restricted to the named authorised departments.
- Buyer profiles are private by default; followable opt-in never makes buyer trust details or contacts public. Respect owner public/private choices. Public profiles contain no listing view/save/stage counts; listing/project counts have no participant identities.
- Redact logs at ingestion and exception paths, including validators, provider responses, upload URLs and nested payloads. Keep safe correlation identifiers and action evidence. Do not log private source documents or credentials during implementation.

### A2. On-platform communication

- Apply contact/off-platform-link blocking to existing messages, enquiries, listing descriptions, FAQs, public content, filenames/metadata and notification-derived content where required by the platform rules. Cover alternate formatting, phone/email/handles, HTML/link representations and attachments to the extent required by the source.
- Preserve the narrow exceptions: a REALTIQ-issued live-viewing link and one-way REALTIQ notifications. A user-supplied Zoom URL is not automatically trusted. Do not remove the permitted public property street address as if it were private contact information.
- Reuse current participant-authorised messaging. Implement applicable guards on existing surfaces; record missing social/issuer-specific surfaces for their owning later batch, with the shared guard contract ready for reuse.

### A3. Files, vault and media entitlement

- Enforce Guest/Registered/Verified eligibility plus resource entitlement before quote, purchase initiation, fulfilment, metadata, SDK/embed link, opening, streaming, byte-range requests and downloads. A paid receipt alone is insufficient if access is revoked or the resource does not belong to that entitlement.
- Implement the source's **Free / Paid / On request / Private** policy. Photos, renders, recorded video tours and a development's master/site plan stay Free. Registered surveys/TDP and vault documents follow the private/request policy; Paid and On request safeguards require current Verified access.
- Seller approval for a request is resource- and recipient-scoped, revocable and auditable. Downloads are denied by default except permitted seller-approved cases. Honour applicable enabled free-access models using explicit entitlements, never a universal bypass.
- Bind existing sessions/tokens to account, profile, document/version, entitlement, expiry and revocation policy. Reject copied tokens used by a different account, expired/revoked access and changed document versions. Preserve atomic view-once handling and concurrent-use protection.
- Implement actual viewer-name/date protection where the source requires a watermark; a response metadata label is insufficient. Do not claim screenshots can be prevented. Log authorised views, their start/end/duration and permitted seller/Console audit access without leaking viewer contacts.
- Private storage must not have a public-original URL that bypasses the API. Signed URLs must be short-lived, appropriately scoped and absent from public search/DTOs. Authorise previews/thumbnails and byte ranges too.
- Validate file content/signatures, section-specific types, size limits and private title upload formats (PDF/JPEG/PNG/WebP up to 50 MB where specified). Scan/quarantine before use, and fail safely if the approved scanner is unavailable. A filename extension or claimed MIME type is not validation.
- Restrict remote media fetches to permitted protocols/hosts, resolving private/link-local/internal IP and redirect risks, including DNS changes. Preserve provider host allowlists and attribution/rights metadata. Broad-format sections do not permit malware or executable content to run.
- Archive listings with transaction history instead of deleting them. Apply approved retention/anonymisation without deleting required transaction evidence. Keep policy decisions explicit; do not invent retention periods.

## B. Current permissions and identity foundations

### B1. Authentication, sessions and access levels

- After token verification, resolve the current active identity/account, requested profile, membership/seat, current role/permission set and resource scope. Do not trust stale role, verification, company or profile claims. Deny by default for unknown roles, missing memberships, invalid profile selection and unexpected state.
- Apply the same rules on HTTP and realtime connection, join, event delivery and actions. Disconnect/restrict existing sockets when access is revoked. Protect scheduled jobs, import progress/undo, exports and background work too; enqueue-time authorisation does not confer permanent permission.
- Support revocation after logout, password reset/change, sign-out of other devices, suspension, blacklisting, deletion, demotion, removed seats, mandate termination and profile changes. Provide active-session listing and selective/all-other-session revocation without exposing tokens.
- Implement the shared two-step/step-up verification contract required by RQS-06 section 4.6 and PRD 21. Require it on relevant sensitive actions already present; record later financial/legal integration points. Client flags cannot assert a completed challenge.
- Return stable machine-readable error codes and safe explanations for authentication, KYC, expiry, disabled feature, missing permission, review pending and conflict. Preserve public browsing and Free media.
- Access levels are separate from account roles and verified listing/title badges: Guest browses/searches/Free media and basic enquiry; Registered with email/phone verification saves searches/properties, gets alerts and uses permitted messaging/free booking; Verified with minimum KYC gets paid/protected features, listing and other full actions. A fee payment never buys identity verification or trust.

### B2. Profile, seat, mandate and department isolation

- One identity can have multiple profiles. Implement the minimum real identity/profile/membership foundation necessary for current ownership and permissions; do not create a second incompatible identity model for a later profile-switcher feature.
- Scope listings, projects, imports, enquiries/messages, documents, saved searches, preferences, notifications and finance responses to the current authorised profile. Personal verification is reusable; company/cooperative verification is per company profile. Profile switching is not elevation of privilege.
- Enforce resource permissions and owner/staff roles: administrator; sales agent with assigned-lead/negotiation limits; project editor for units/prices/media/progress/freshness; finance without editing rights; viewer read-only; custom permission sets. Reject removed/expired seats and cross-company/profile IDs.
- Seller's Agent editing/boosting needs an active resource-specific mandate. One party has editor/boost authority at a time. Corporate/cooperative final terms require an authorised signatory; neither a delegated buyer's agent nor arbitrary staff can accept final terms merely because they can read the resource.
- Staff access is department-scoped, with designated executive Super Admin and read-only Internal Audit. Multi-role staff still cannot verify their own submission, approve their own sensitive preparation or approve a payout-account change they made. Title revocation needs two distinct people. Implement guards for applicable existing operations; later workflows must reuse them.
- Protect list queries, count queries, search/populate joins, detail, export and provider-verification endpoints. Unknown roles must not fall back to `{}`. Authorise the payment owner before a provider lookup; checking only after fetching is too late.
- Record the real acting staff member and effective profile/resource in permanent audit evidence. Do not expose buyer/seller private material to independent verifiers; preserve their condition-only access with no amounts or negotiation messages.

### B3. KYC, verification and eligibility

- Model/validate the source's Nigerian and international identity routes, corporate/cooperative details, owner/developer/agency/professional requirements and authorised signatories. Do not treat one uploaded file or an old `isVerified` flag as proof of all required checks.
- Nigerian route: BVN, NIN slip/card, additional approved government ID and proof of address. International route: passport, country-of-residence national ID and overseas address proof, using the Console-maintained accepted list.
- Company/cooperative checks include the applicable registration, TIN, directors/executives, beneficial owners, signatories and authority/resolution details. Developer/agency requirements include their applicable CAC/business-name, SCUML and state registrations. Partner credentials depend on service/specialty; proxy visitors use identity/address and approved proxy vetting, not invented professional licences.
- Expiring identity/licence/insurance/registration evidence has expiry/reminder states. Suspend only the dependent service/feature when an item expires; the rest of a profile retains permitted access. Suspended/blacklisted profiles cannot be hired/booked. Identity, company and payout changes trigger the required re-verification.
- Require name-matched payout/split setup before the first listing/job where specified. Represent missing provider capability as pending, not verified. Owner active-listing caps and enabled plan publication gates are configurable; plan lapse must not revoke existing transactions, instalments, escrows or previously paid access.
- Do not activate mortgage features or charging simply because their data fields exist. Respect the built-disabled launch rules.

## C. Canonical listing, project and unit data

### C1. One dictionary, validation and effective values

- Establish one source-derived field dictionary shared by models, create/update/draft/publish validation, bulk grid/paste, CSV/XLSX templates, imports, search/facets, maps, public projections and future Compare consumption.
- Preserve stable internal keys with the exact source display labels and source IDs. No ad hoc enums in controllers. Distinguish descriptive fields from filterable fields.
- Every unit is a searchable saleable record. Implement effective value precedence **explicit unit override -> unit type -> project** for the applicable fields. Preserve meaningful zero/false and distinguish omitted, reset-to-inherit, explicit null/not-applicable and POA. Do not use truthiness fallback.
- Retain shared estate facilities and unit-feature semantics; applicable effective amenity sets combine the prescribed project/type/unit facts. Delivered/Planned states must not be lost or advertised as verified delivery.
- Changes to a type/project recompute affected non-overridden units and invalidate the relevant search/aggregate/alert caches. Return impact counts before applying changes; existing overrides remain intact. Support reset-to-type/project with an explicit contract.
- Drafts can store incomplete answers. Separate field validity, intake-requiredness, publication readiness, search eligibility and verified-listing readiness. Return exact field-specific blockers/warnings, not fabricated zeros/defaults or a generic completion percentage.
- Safely migrate six-type legacy listings, location strings, area fields, prices, build stages and status meanings. Do not guess precise subtypes or convert square feet contrary to the specification. Use a dry-run mapping report, unresolved-record queue and explicit owner reclassification/re-entry where needed.
- Keep existing identifiers/references and links valid. Version/backfill materialised projections safely. Provide idempotent, resumable migration tooling and rollback/recovery documentation; do not execute changes against production/customer data as part of implementation.

### C2. Exact vocabulary

Extract and verify these lists against the source, including accents/apostrophes and category relationships. The names below aid coverage; the PDFs govern exact labels.

**Flats & Apartments (12):** Flat / Standard Apartment; 1-Bedroom Flat; 2-Bedroom Flat / Apartment; 3-Bedroom Flat / Apartment; 4-Bedroom+ Flat / Apartment; Mini Flat (Room & Parlour); Self-Contain (Self-Contained); Studio Apartment; Penthouse; Maisonette; Serviced Apartment; Block of Flats.

**Houses (10):** Detached Duplex; Semi-Detached Duplex; Terraced House; Detached Bungalow; Semi-Detached Bungalow; Terraced Bungalow; Townhouse; Mansion / Villa; Chalet; Boys' Quarters (BQ).

**Commercial Buildings (18):** Office Space; Co-Working Space; Shop / Retail; Shop in a Mall; Showroom; Plaza / Complex / Mall; Restaurant / Cafe Space (use the source's accented label); Warehouse; Cold Room / Logistics Hub; Hotel / Guest House; Filling Station; Petrol / Gas Plant / Tank Farm; Factory; School; Hospital / Clinic; Event Centre; Place of Worship; Other Commercial.

**Mixed Use (1):** Mixed-Use Building.

Estate is a development container/gazetteer tier, not a physical type. Shell/uncompleted structure is a build stage, not a physical type. Exclude standalone land, plots, rentals, leases and short lets from new entries and public indexing. Occupied property remains a sale and does not enable tenancy/rental-income features.

**Eight build stages:** Off-plan; Under construction; Uncompleted building; Semi-finished (Advanced Shell / Lock-up); Newly built; Renovated; Previously owned; Old.

**Five phases / 16 milestones:**

- Site Preparation & Substructure: Site Clearing & Excavation; Foundation Footing; DPC (German Floor).
- Carcass: Blockwork / Lintel Level; Decking; Roofing / Parapet.
- Semi-Finished: Lock-up; First-Fix Infrastructure.
- Finishing: POP Ceiling; Tiling & Floor Finishes; Second-Fix Installation; Screeding & Painting.
- Commissioning, External Works & Handover: External Works & Services; Snagging & Inspection; Handover.

The supplied list visibly names **15** milestones while the source describes **16**. Verify the full source figure/table before seeding; document the discrepancy if it remains. Never invent a sixteenth milestone to satisfy a count.

**Amenities (44):**

- Space & Layout (12): Boys' Quarters (BQ); Maid's Room; Guest House / Chalet; Study / Home Office; Family Lounge; Balcony / Terrace; Rooftop Terrace; Private Garden / Compound; Home Cinema; Private Gym; Basement; Attic.
- Power, Water & Sanitation (11): 24-Hour Electricity; Solar / Inverter System; Backup / Standby Central Generator; Dedicated Transformer; Connected to Electricity Distribution; Pre-Paid Meter; Dedicated / Industrial Borehole; Central Water Treatment Plant; Connected to Public / Municipal Water; Septic Tank; Municipal Sewage System.
- Interior Fittings & Fixtures (7): Fitted Kitchen; POP Decorative Ceiling; Central Air Conditioning; Water Heater; Fitted Wardrobes; Passenger Elevator / Lift; Smart-Home Automation.
- Estate Security, Leisure & Site (14): Gated Access Estate; 24/7 Uniformed Security / Access Post; CCTV Surveillance; Video Intercom; Electric Fencing; Swimming Pool; Fully Equipped Gym; Estate Clubhouse; Children's Play Area; Sports Court / Tennis; Waterfront / Ocean View; Flood-Free / Covered Drainage; Paved / Interlocked Access Road; Shared / Estate Parking.

Project amenities have no free-text substitutes. Individual-property `Other amenity` content is display-only and not a filter. Catalogue BQ/Serviced concepts must remain distinct from similarly named physical property types.

**Title declarations (11):** C of O; Global C of O; Governor's Consent; Deed of Assignment; Deed of Sub-Lease; Letter of Allocation; Registered Survey; Excision; Gazette; Approved Building Plan; R of O. Individual-property flow additionally supports No title document declared. Declaration is not verification; files/references remain private.

Extract the complete fixed architectural-style list from RQS-03 section 3.2/PRD 5.5. Typed unlisted styles are display-only. Catalogue updates, gazetteer, weights, limits and timings identified as Console settings need permissioned, audited configuration without a code change.

### C3. Exhaustive field coverage

Implement and test every field below using its source-defined control/value, requiredness, condition and mapping. Composite rows must become individual matrix entries.

| Source group | Required field coverage |
|---|---|
| RQS-02 P1-P9 | Project name; immutable account-derived Listed By; verified developer name; development structure; short description; full description; logo; FAQs; grouped/individual unit display choice. |
| L1-L9 | State; LGA; Area; gated-estate choice; estate name; public street address; project pin; access-road conditions; nearby places. |
| D1-D6 and D1a | Build stage; completed-before-handover choice; construction milestone; projected handover month/year; launch date; construction start/Not started; target months for remaining milestones. |
| S1-S8 and S7a | Delivered/Planned estate facilities; serviced status; annual service charge/None; root title declarations/private uploads; payment options; instalment months; deposit percentage; escrow per payment type; all specified payment-template fields, including fee payer. |
| T1-T9 | Approximate count; type name; category; exact physical type; quantity; bedrooms; full bathrooms; powder rooms; all-en-suite. |
| T10-T16, T11a, T12a, T16a | Internal floor area; unit footprint; whole-building footprint for shared lots; plot/shared-site size; computed unbuilt area; number of floors; furnishing; parking count; catalogue unit features; architectural style. |
| T17 and T17a-T17d | List price/POA; currency; confidential reserve price; negotiability; optional second seller-stated price in the other currency. |
| T18-T19 | Type overrides for build/delivery/service/payment facts; phase/block and its applicable schedule. |
| T20-T26, separately | Permitted/intended commercial use; frontage in metres; commercial floors/units; loading/vehicle access and type; power capacity and backup; lift count; fit-out level. |
| U1-U5, U2a-U2b | Project-unique unit identifiers and system references; availability/Not released; protected system-captured actual sale price/completion date; occupancy; unit price/history; all permitted overrides/reset; flat floor level/Ground. |
| M1-M11, M1a-M1c, M5a, M7a | Project photos/cover; renders; dated milestone progress; project walkthrough; drone; aerial/source/attribution; approach/access-road media; public master/site plan; private registered survey; technical files; type/unit photos and renders; recorded walkthrough; dimensional floor plans; 3D/provider link; position on site plan. |
| V1-V4 | Specific/recurring open houses; appointment-only viewing; live-video availability; show-home type/finish/location/hours/appointment metadata. |
| R1 | Publish all ready, publish selected or save draft; blocked units remain unpublished with reasons. |
| RQS-04 A | Single Property/Development; account-derived advertiser; optional Seller's Agent mandate/editor; type-only/type-and-name Listed By choice; headline; description; unique read-only reference. |
| B1-B13 | Nigeria; State/LGA/Area; estate/standard address path; standard street/house/optional unit; estate access street/name/internal street/house-unit; Nigeria-bound map coordinates. |
| C1-C3 and shell rule | Four categories; exact category-compatible type; all seven commercial fields; shell represented by physical type plus build stage. |
| D1-D8 and D5 subfields | List price/POA; NGN/USD and optional second price; price history; payment options/instalment months/deposit/escrow per option; annual NGN service charge/None; private reserve; negotiability; specified listing payment-template/payer inputs. |
| E1-E5 and E1a | Build stage; completion-before-handover; milestone; handover month/year; construction start; remaining milestone targets. |
| F1-F4 | Bedrooms; full bathrooms; powder rooms; en-suite, with residential/commercial nullability and no arbitrary prefill. |
| G1-G5 | Internal floor area; unit/whole-building footprint where applicable; plot/shared-site size; terrace/townhouse floors; calculated unbuilt area. |
| H1-H6 and every I group | Furnishing; serviced; parking; road conditions; occupancy; fixed/typed style; all 44 amenities and display-only Other amenity. |
| J1-J5, J1a | Title declarations/No title; private title reference identifiers; tagged private files; identity/authority verification pack; commercial verification pack; reviewed distress-sale proof. |
| K0-K13, K1a-K1b | All dedicated upload sections, renders/progress, recorded/live/3D, dimensional plans, drone/aerial/approach, private survey/TDP, optional public master/site plan/private registered survey, technical files, specific/recurring open houses and private showing availability. |
| L1-L3 and actual-sale subfield | Public availability; guarded system-captured sale/completion details; original publication timestamp; monthly confirmation and freshness/checkout-pause state. |

### C4. Rules that must not be lost in implementation

- Only Verified eligible developer profiles create projects; ownership and Listed By come from the authenticated account, not writable request fields. Development selected from individual listing routes to the project flow. Project creation itself has no extra listing-kind step.
- Support all eight draft steps with autosave/resume and field-level readiness. Type generation, single-unit entry, grid/paste and imports write the same records. Single-unit project entry uses quantity-one type semantics; mixed-use components have their own category/unit records.
- State -> LGA -> Area -> optional Gated Estate uses valid stable gazetteer relationships. Parent changes clear dependent children. Unlisted areas/estates use Mapbox identity matching or Listings Quality review, not automatic publication of arbitrary strings. Provide pending/review states and permitted staff resolution.
- Nigeria is locked. Coordinates must be valid and within Nigeria, not merely inside latitude/longitude global bounds. Project units inherit one project pin; unit positions belong on the site plan.
- Full property street addresses are permitted public data; mark them verified only after the required address checks. Provider failure cannot create a verified badge. Do not treat city names as LGA IDs.
- Accept only sqm for areas and metres for frontage/dimensions. Reject new/imported square-feet or plot-count units; do not silently convert them. Keep internal usable space, unit footprint, whole-building footprint and plot/shared-site size distinct. Compute unbuilt area from the correct footprint and guard invalid relationships.
- Whole-number non-negative room/parking/price fields and positive areas/quantities follow exact source rules. Null commercial room counts stay null, not zero. Bedroom-labelled flat types set their prescribed room values. En-suite is conditional; terrace/townhouse floors are conditional; residential records do not retain commercial values after category changes.
- Off-plan/Under construction, or unfinished stock to be completed before handover, requires the prescribed milestone and month/year handover. Otherwise clear inactive dependencies and use Sold as is where applicable; it is not a ninth build stage. Keep original/revised target dates and dated milestone evidence.
- NGN/USD only, with optional second price in the other currency. POA clears the public numeric price without becoming zero. Required reserve stays private and cannot exceed numeric asking price where one exists; POA reserve constraints need the source decision below.
- Preserve original/current asking price and timestamped price/status/reduction history per unit; launch date, confirmation date and edit date do not reset original publication recency.
- Outright/Instalment are payment options; escrow is a separate optional layer per option, not a payment type. Clear instalment-only terms when disabled; months > 0 and deposit 0-100. Do not force instalments above a hardcoded price threshold. Store required fee-payer/refund/default/penalty template inputs without implementing new money movement in this batch.
- Mortgage data is reserved/built-disabled; no live launch search option or server bypass without approved activation. Plan/owner-cap/payout eligibility must be checked on publication where applicable, not only when opening a form.
- Keep Draft/In Review/Changes Needed/Paused/Withdrawn/Archived and Not released distinct from public Available/Under Offer/Sold. New eligible published units start Available. Do not let create/patch/import/bulk status writes fabricate Sold, legal ownership, a completion date or an actual sale price. Integrate completion evidence from existing transaction paths; list the full transaction-state repair in batch two.
- Public project counts, prices, title counts, availability and effective search data use only eligible published records. A no-published-unit project has no public available inventory. Private dashboard totals remain separately authorised. Staleness never unpublishes or changes availability; monthly confirmation, about-60-day Needs confirmation and about-90-day checkout pause are configurable and recorded per affected unit.
- Existing media sections determine media kind. Photos/renders require image content and recorded walkthroughs video content; other sections accept source-permitted formats under security controls. Keep default Free items Free. Do not infer a video/floor-plan/3D flag from a generic upload.
- Preserve photo-count/shot-type requirements for verification (default five, with the specified completed/off-plan evidence); minimum public/photo-search eligibility is different from verified-listing eligibility. Commercial/mixed verification requires floor plans, approved building plan and parking-capacity evidence.
- Title declarations and document hashes do not create a verified fact. Verification status includes what was checked, source/date and policy reference. Preserve the distinction between identity verification, verified listing, verified title and trust tier.
- Support canonical property matching using title references, normalised address/Mapbox location, physical type/size tolerance and source supporting signals such as unit refs/photo/title hashes. Reuse existing title deduplication. Same seller/mandated agent links to the record; a different seller is held for authority review. Sold-property relisting needs buyer-of-record identity or approved transfer proof. Keep review signals private, and present duplicate listings as one property. Do not claim to know sales outside REALTIQ.

## D. Search, filters, maps, aggregates and alerts

### D1. One canonical query contract

- Implement one validated, bounded server-side normalisation/query/effective-unit pipeline over the full eligible catalogue, reused by results, matching-unit lists, facets/live counts, maps, project cards and saved-search evaluation. Do not fetch one page and filter/sort it in application/frontend memory.
- OR within an attribute; AND across attributes; strict AND for keyword tokens and selected amenities. Every requested attribute must match **the same unit**. For example a 90M flat plus a separate 4-bedroom 150M house cannot satisfy 4 bedrooms under 100M.
- Match keywords case-insensitively across headlines/descriptions and the permitted project description/name context. Bound token count/length and page size, escape/reject dangerous regex patterns, reject operator/object injection and validate geo inputs. Adopt indexes appropriate to the real query workload.
- Use stable internal parameter keys, deterministic normalised multi-value ordering, default semantics and versioned saved filters. Support complete URL round-trip and server-visible metadata for frontend chips/normalised/swapped ranges. Reject invalid values rather than silently broadening a query; clear/ignore inactive dependent controls consistently and explain normalisation.
- Exact public reference lookup pauses criteria/sort and returns the unique eligible public listing/unit with its project context; unknown references have a safe no-match response. It bypasses filters, never publication/privacy/ownership ACLs. The frontend can restore retained prior filters when the reference is cleared.
- Defaults: All Nigeria, Available Only, With Photos Only On, Include Unpriced On, Search as I Move the Map Off and Recommended sort. Clear All restores defaults rather than turning safety/default filters off.

### D2. Complete filter inventory

Implement source values, dependencies and thresholds for every row. No recognised filter can be accepted by the API and then ignored.

| Group | Filters and semantics |
|---|---|
| Geography | State/LGA/Area/Gated Estate multi-token OR, maximum 10 tokens and parent absorption; optional active viewport AND constraint; commute 15/30/45/60 minutes from validated target. Gazetteer suggestions require published stock, parent breadcrumbs and source ranking by level/count. |
| Price | NGN min/max, shorthand k/m/b, seven price chips (Under 25M; 25-50M; 50-100M; 100-250M; 250-500M; 500M-1B; Over 1B), price-reduced-since-listing, negotiability, annual service-charge Any/None/caps 500k/1M/2.5M/5M, Include Unpriced. POA inclusion remains controlled by its toggle even with a numeric range. |
| Payment | Outright Purchase / Instalment Plan; instalment duration Any/6+/12+/24+/36+; initial-deposit cap Any/10/20/30/50%; Escrow Available. Clear term filters without Instalment. Mortgage excluded from launch search. |
| Build/delivery | All eight stages, Ready to Move In macro (Newly built/Renovated/Previously owned), reached milestone/phase selection, month/year handover From/By. Macro suppresses handover dependencies; source stage dependencies govern active search inputs. |
| Rooms | Bedroom min/max/exact, with exact 6+ meaning >= 6; full bathrooms; powder rooms; All Rooms En-Suite. Null commercial room counts are not excluded by these filters unless an explicit count exists. |
| Size/structure | Internal floor area min/max; unit footprint min/max; plot/shared-site size min/max in sqm; Number of Floors 2/3/4+ for Terraced House/Townhouse. Whole-building footprint/unbuilt area are descriptive, not extra filters. |
| Condition/services | Furnished/Semi-Furnished/Unfurnished; Serviced/Not Serviced; parking thresholds 1+/2+/3+/4+/6+; Tarred/Untarred/Flood-prone/Sand-filled road conditions; Vacant possession/Sold with occupiers; fixed architectural styles. |
| Amenities | All 44 catalogue entries with strict AND against the applicable effective set. Typed other amenities do not act as catalogue matches. |
| Title/verification | Eleven declared titles OR; no-title hidden count when filtering; independently Platform-Verified Title Only and Platform-Verified Listing Only. Declaration/payment cannot satisfy verification. |
| Provenance/following | Real Estate Agent / Primary Developer / Direct Property Owner; From Accounts I Follow for Registered users with current identity/profile scope. Integrate valid follow data; if the social prerequisite does not exist, record that dependency explicitly, never return an unfiltered result as if it applied. |
| Recency/status | Publishing-time Anytime/24h/3d/7d/14d/30d; Available plus requested Under Offer/Sold inclusions; source-defined stale visibility/ranking. Draft/unapproved/Not released excluded regardless of flag. |
| Media | With Photos Only; Has Video Tour with Live/Recorded options; Has 3D/Virtual Tour; Has Floor Plan; Has Drone Fly-Through. Count eligible typed media, without leaking private links/content. |
| Viewings | Open House; Open house this weekend including recurring weekly schedules; Private Showings By Appointment; Has Show Home. Evaluate actual schedule/availability metadata in the configured timezone. |
| Distress | Only administratively reviewed proof of at least 15% below valuation makes a listing searchable as Distress Sale. Do not accept the seller checkbox alone or invent a valuation. |

Display currency is **not a catalogue currency filter**. Remove Any Currency, Featured/Not Featured and unsupported land/rental controls from the buyer query contract. Sponsored/Featured badges do not waive any filter.

### D3. Currency, sorting, ranking and result consistency

- All price indexing, sorting and range queries use base **NGN**, including USD asking prices converted with the approved current/previous-day rate. Return original seller price/currency, optional second seller-stated price, conversion provenance and rate timestamp distinctly.
- Buyer-entered display FX changes presentation only, never catalogue membership/order, seller prices, reserve values or payable quotes. Do not compare nominal NGN/USD numbers. Do not silently use a fabricated, arbitrarily old or fallback rate; document exact unavailable/stale behaviour pending the source conflict decision.
- Implement all 12 sorts: Recommended; Newest / Most Recent; Price Low to High; Price High to Low; Handover Date Soonest; Verified First; Recently Reduced; Price Reduced Largest Drop; Bedrooms Most; Floor Area Largest; Highest Rated; Trust Tier.
- Sort globally **before** pagination, with deterministic final tie-breakers and documented pagination consistency. POA comes last in both price directions. Null bedroom/floor-area values go last; never-reduced listings come last for reduction-recency sort. Handover soonest follows the off-plan/under-construction scope and excludes ready/existing stock.
- Recommended uses the source's verification, media richness, recency/freshness, profile completeness and active Sponsored factors with audited Console weights. Equal 20% weights are test/build placeholders, not approved live settings. Featured has no ranking weight. Paid placement is labelled/capped and never bypasses filters; do not implement the entire campaign system here.
- Highest Rated requires at least two qualifying reviews, ties by review count then Recommended, and unrated listings after rated ones. Trust Tier is Platinum/Gold/Silver/Bronze/New, ties by actual trust score then Recommended, removed tiers last. Validate real seller/developer provenance from existing review/trust services; do not fabricate scores, use buyer ownership as seller history or let payment buy trust.
- Group project results after effective matching with project/unit counts, matching-only price/bedroom/type/handover ranges and grouped matching-unit lists. Price sort keys use the lowest matching unit price; earliest handover uses matching units. Prevent double-counting duplicate property records and orphan/unpublished units.
- Maps, catalogue counts, facets, cards, matching-unit expansion and alerts agree for the same canonical criteria. Return public-safe coordinates/counts and preserve geo context. Do not disclose private inventory through facets/suggestions/cache keys.
- Provide zero-result diagnostics and suggested changes, with counts for individual constraint removal and the source fallback ladder: relax keywords/exact bedrooms, broaden Estate -> Area -> LGA, expand price by +/-20%. Do not silently relax the actual search or paid matching; return explicit candidate criteria for frontend confirmation.
- Index/cache/invalidate for publication, moderation, unit overrides, type/project changes, currency-rate updates, price reductions, verification changes, freshness and relevant role/profile visibility changes. Authorised private and public results must not share unsafe cache entries.
- Measure P95 < 300 ms for applicable search/count/facet workloads on a representative isolated dataset; report actual conditions and results. A mocked benchmark or historical failed load artifact does not prove this target.

### D4. Saved searches and alerts

- Registered users can save every active filter, location token, map bound, sort and default state under the correct identity/profile. Support authorised create/read/update/delete, toggle alerts and selected new/reduced-listing triggers.
- Use the same validated canonical predicate and public eligibility as interactive search. Migrate legacy saved-filter keys without silently changing user intent; flag unresolved old values.
- Apply cadence in the processor: Instant within 15 minutes of ingestion, Daily Digest, Weekly Summary. Use durable due-times, proper time boundaries and leases; a weekly search must not notify on every scheduler tick.
- Cover new listings and reductions on existing listings. Timestamp-only `createdAt` checkpoints are insufficient: use deterministic event/cursor tie-breakers and durable batches so >20 simultaneous matches, reductions, restarts and retries do not skip or duplicate events.
- Deliver through the shared notification interface with per-profile/category/channel preferences: in-app, Postmark email, Termii SMS/WhatsApp and FCM push as applicable. Implement relevant adapters/contracts required for saved alerts now; record missing live credentials as external verification blockers, not pretend successful delivery.
- Track durable notification/delivery idempotency, attempts and channel success independently from evaluation. Do not advance a delivery watermark as though a failed delivery succeeded; do not repeat a successful channel when another channel retries. Avoid starvation past batch limits.
- Mandatory security/payment/legal notices retain their source policy; promotional matches honour opt-in/preferences and are explicitly Sponsored. Never include other-party contacts/private prices/documents in alert content or deep links.
- Authorised deep links must resolve to current public/recipient-permitted content. Recheck publication/permission changes before dispatch. Include safe per-profile unread counts and operator diagnostics without raw private payloads.

## E. Imports, grids and bulk operations

- Extend the real existing staged CSV/XLSX service. Preserve upload/session/preview/row edits, retry and owner checks. Do not replace it with mock import success or a synchronous upload-to-publish shortcut.
- Generate templates from the canonical dictionary, prefilled with authorised existing types/units and XLSX dropdowns for all controlled options. CSV cannot contain spreadsheet dropdowns; provide the same machine-validatable allowed values. Protect spreadsheet exports from formula injection and confidential field leakage.
- Header matching/manual mapping covers every applicable source field, including the frequently omitted **T20-T26**, second price, shared footprint, occupancy, escrow per payment option, inheritance/reset semantics and private reserve inputs. Preserve source column/row IDs and field-specific allowed-values messages.
- Preview groups Ready/Warnings/Errors, identifies exact failing cells and accepts edits/re-upload. Distinguish valid-draft, invalid-held-draft, publish-ready and verification-ready. Never publish a row just because its syntax is valid.
- Valid rows can proceed while invalid rows remain held as drafts according to the resolved source readiness matrix. Invalid staging values must not enter public search or bypass canonical persistence validation. Do not reject all valid rows merely because another row is invalid.
- Existing Unit IDs in update mode update the authorised project unit only after explicit developer confirmation; they must not silently duplicate, overwrite another project or import platform-only Sold/actual-sale/verified states. New type creation and duplicate-project warnings require the specified confirmation.
- Enforce project-unique Unit IDs with database-backed uniqueness; global public references are unique. Stable session/row operation keys and atomic claims prevent two confirm requests/workers from creating two units. Identical rows differing only by ID are warnings; duplicate IDs are blockers, not merely a preflight lookup.
- Import/bulk processing for hundreds of units runs in durable background jobs, with enqueue/status/result APIs, lease/heartbeat/recovery, bounded chunks, cancellation policy, retries and idempotent persistence. HTTP confirm returns job state promptly. Restart after a row is saved but before its status is saved must still produce one unit.
- Recheck current permission and resource version during execution. A removed seat, terminated mandate, deleted type, sold unit or changed project cannot be ignored because the request was previously authorised. Return per-row conflicts and safe partial results.
- Grid reads use server-side paging/filter/sort for type, availability, publication, price and problems. Return raw overrides plus public/authorised effective values and their provenance for inherited-versus-overridden display; sensitive seller fields need a separate authorised projection.
- Bulk actions support the source set: availability, price amount/percentage, move type, clear overrides, publish/unpublish, delete where permitted and monthly confirmation. Shared validators govern inline edits and pasted values. Price operations preserve currency/history/precision and do not create arbitrary ownership/completion states.
- Prevent reducing type quantity below sold units, deleting sold/transaction-bearing units/types and undoing completed sales. Never reuse identifiers improperly. Keep preview generation and actual generation consistent.
- Provide result counts and row/cell reasons, plus the specified one-step undo backed by recorded before/after values and actor. Undo checks current permissions and versions, refuses conflicting intervening edits/transactions, preserves audit evidence and updates projections/caches safely. Do not implement undo as blindly restoring an old database snapshot.
- Recalculate public eligible counts/ranges and search projections after successful changes; private draft imports cannot change public availability or minimum price. Failed/retried/undone jobs must leave consistent counts and history.

## F. Decisions and boundaries to make explicit

Use source detail to resolve what is unambiguous. Record remaining conflicts with exact passages and consequences:

1. **FX source/age/fallback:** NFEM/CBN versus mid-market wording, unavailable current/previous-day rates, indexing versus buyer display versus transaction conversion. Never use buyer override to change results.
2. **Source milestone count:** source describes 16 milestones but the readable grouped list names 15; verify figures/tables before choosing canonical entries.
3. **Required intake versus publication:** RQS-02 field-table requiredness, section 7 blockers, floor-area/title/furnishing gaps and R1 choices must not be merged into one validation rule.
4. **Photo requirement versus photo-less publication:** required M1/M7 intake versus publication allowed but hidden under Photos Only. Keep verification photo count separate.
5. **POA and reserve:** required confidential reserve bound against a numeric list price when POA has no numeric asking price; do not make POA zero or waive the rule silently.
6. **POA versus mandatory Compare asking price:** retain valid source listing data and mark future Compare eligibility unresolved where necessary.
7. **Developer label aliases:** Developer versus Primary Developer must map consistently to one advertiser key without changing the specified UI labels.
8. **Commercial use list, dictionaries and migration:** do not invent unspecified commercial-use choices, taxonomy mappings, gazetteer entries, thresholds/tolerances or live recommended weights. Source-provided architectural styles take precedence over a vague to-be-defined reference.
9. **Completed-before-handover versus search dependencies:** onboarding supports unfinished stock being completed before handover; search controls explicitly depend on selected lifecycle values. Document exact query semantics.
10. **Publication and matching authority:** preserve review, payout, owner-cap, plan and different-seller property-review gates; unresolved provider verification does not become a successful check.
11. **Security, privacy and retention:** verified-access evidence, department permissions, high-value document checks, scanner/watermark capability, approved retention and redaction policies.
12. **External providers:** approved Mapbox/verification/FX/channel credentials, domains/rights and representative sandbox evidence. Never invent a working provider or require production credentials in source files.
13. **Clipped/conflicting source:** specification pages 5/75/95/148 and the summary display-currency acceptance wording; capture unreadable requirements and use unambiguous detailed NGN indexing rules.

Later-batch ownership: full bilateral offer/quote/reservation and escrow/instalment money-state repair; complete Compare; posts/Following/Explore/campaign budgets; complete agency/Partner service workspaces; issuer-specific document lifecycle and broader authority/resale user journeys; full fee/recurring/tax/revenue engine; all tour-provider integrations; ecosystem OIDC/webhook/consent/outbox rollout; complete ROI/trust/retention expansion and whole-platform operations/UAT. Implement their **necessary current access, data, validation, matching or notification prerequisites** here and link dependencies. Do not charge or implement a whole new module merely because one shared guard references it. Do not claim first-batch completion while an applicable filter/access path is silently stubbed or unsupported.

## G. Implementation approach and API handoff

1. Reconfirm source files/routes, current scripts/tests and entry-point side effects. Inventory the five areas and build the coverage/decision matrices.
2. Implement response privacy, current permission/session checks and file-access isolation first.
3. Implement the shared dictionary, typed schemas/effective values, publication/readiness and safe migration tools.
4. Implement canonical full-catalogue search, public projections/maps/counts/facets/ranking and alerts.
5. Complete imports/grid/bulk jobs/undo on the same contracts. Finish targeted integration and regression verification.

Maintain existing API compatibility where safe, but do not preserve insecure fields or contradictory semantics for compatibility. Document breaking corrections explicitly, provide safe versioning/deprecation where useful, and coordinate request/response changes with the frontend through `docs/first-batch-frontend-api-handoff.md`.

The handoff must describe actual implemented routes/methods, authentication/profile context, field dictionary IDs, request/response examples, enum labels, null/override/reset semantics, pagination/sort/defaults, counts/maps/facet/diagnostic contracts, saved-search cadence/triggers/channels, import mappings/row errors/job progress/retry/undo, protected-file access and all stable error codes. Include removed confidential fields and the permitted replacement public image contract. Do not guess routes before reviewing router mounts. Keep technical traceability in developer docs, not customer-facing product text.

Do not edit the frontend repository to implement this backend task. Read its API callers/types as needed and provide the handoff. Use existing backend structure and supported runtime/dependencies; justify any necessary dependency and inspect installation/build scripts before running them.

## H. Meaningful verification and acceptance

The audit's 225 passing tests across 28 files were local/mocked/source-level checks with external HTTP and database connections blocked. They do not certify persistence, concurrency, providers or deployed behaviour. Starting `index.js` can connect to MongoDB, create indexes and start schedulers; inspect configuration first. The actual connection key is `MONGO_URI`; the old cron guide used `MONGODB_URI` inconsistently.

Use isolated disposable test data/database with the transaction/index topology needed by the implementation. Never point tests, jobs, migrations or load checks at production or unknown configured databases. Keep production migration execution and deployment outside this task. Provider sandbox tests require authorised credentials; if absent, run meaningful local protocol/error tests and mark live provider verification pending.

Minimum acceptance set:

- **Privacy matrix:** Guest, Registered, Verified, owner, other owner, assigned staff, unrelated staff, finance, verification officer, viewer, Super Admin and removed seat/mandate. Test lists/detail/populate/export/search/facets/notifications/socket/logs. No restricted contacts/KYC/selfies/reserve/private URLs leak; permitted own-account access works.
- **Revocation:** HTTP and active sockets deny after logout/reset/suspension/deletion/demotion/profile/seat/mandate changes. Profile-ID spoofing and unexpected-role list fallback fail safely; session management and step-up proof cannot be forged.
- **Protected files:** quote/init/open/metadata/download/range access denied before provider/storage fetch when unauthorised; copied/revoked/expired/wrong-resource tokens fail; concurrent view-once is atomic; watermark exists in actual protected output; original links cannot bypass the API.
- **Uploads:** forged MIME/signature, excessive size, unsafe formats, quarantined malware, internal-IP remote URLs and redirect/DNS tricks are blocked; allowed section-specific media/title files work. Scanner unavailability does not claim a clean scan.
- **Field coverage:** every source field round-trips create/patch/draft/publish/reload/import/effective search. Test default/conditional/reset/null/zero/false, precise decimals where allowed, all category relationships, all seven commercial fields, dual price/POA/reserve, history and source enums. Invalid square-feet, unsupported currencies and excluded asset classes are rejected.
- **Inheritance:** unit > type > project, override preservation, reset-to-inherit, type edits, phase changes and cache/search updates. A commercial null-room unit remains eligible under source room semantics. Single-unit, mixed-use and shared-lot fixtures work.
- **Publication:** blocked versus limited-filter fields, source review statuses, unapproved/unpublished cheapest units, photo-less/default-photo handling, dormant mortgage, expired credentials, pending payout setup, owner cap/plan gates and protected ongoing paid access. No arbitrary status write/import can fabricate Sold/Owned or actual-sale evidence.
- **Canonical search:** out-of-first-page keyword matches, strict multi-keyword AND, all filters individually and combined, same-unit project matching, proper OR/AND/amenity semantics, reference override with publication ACL retained, map/count/facet/card/alert parity and deterministic URL/save round-trip.
- **Ranking/FX:** global sort before paging, all 12 sorts, stable ties/no duplicates/skips on a stable dataset, POA/null positions, asking-price currency normalisation, stale/missing FX, buyer display override invariance, no reserve/sale-price sorting, real review thresholds and trust provenance, Featured neutrality and Sponsored filter compliance.
- **Freshness/history:** monthly confirmation, 60/90-day boundaries/configuration, per-unit/group confirmation, revised targets, reductions, original publication recency, stale visibility and paused-checkout guard.
- **Alerts:** Instant <=15-minute scheduling, Daily/Weekly due times, reduction events, >20 and >500 batches, same-timestamp events, restart/lease races, disabled preferences, profile isolation, removed listings, partial channel failure, durable retry/dedup and no successful-delivery checkpoint on failure.
- **Imports/bulk:** several-hundred-row CSV/XLSX, every mapped field, mixed Ready/Warning/Error rows, invalid held drafts, update/new-type confirmation, duplicate IDs/rows, two confirmations/workers, crash after save, restart/retry/cancel, permission removal while queued, wrong-project IDs, sold/history guards, result counts and one-step undo with intervening-edit conflicts.
- **Migration:** repeat dry-run/run on isolated fixtures, ambiguous mappings, legacy unsupported units/types, retained references, resumability, conflict handling, rollback/recovery and no public indexing of unresolved records.
- **Performance:** representative isolated search/facet/map/grid workloads with stated dataset/indexes/cache/concurrency and measured P95. Report gaps honestly; do not expand into disruptive production load testing or claim whole-platform SLA proof.

Run appropriate existing regression tests plus real isolated API/database integration/concurrency tests for changed behaviour. Test public contract schemas and meaningful behaviour, not only source-string assertions. Repeat/broaden tests only when changes or failures justify it. Keep mocks explicitly labelled and do not report external provider success without evidence.

## I. Deliverables and completion standard

Deliver:

1. Implemented backend changes for the five first-batch areas and their necessary shared prerequisites.
2. Source-derived canonical dictionary/query/import contracts and safe migration/index tooling.
3. Meaningful tests with recorded commands, environment boundaries and results.
4. `docs/first-batch-requirement-coverage.md` with every applicable atomic requirement and evidence.
5. `docs/first-batch-decisions-and-dependencies.md`, including clipped/conflicting requirements, external blockers and precise later-batch ownership.
6. `docs/first-batch-frontend-api-handoff.md` with actual implemented contracts and frontend changes required.
7. `docs/first-batch-backend-completion.md` summarising outcomes, affected files, migration/runbook steps, test evidence and remaining risks/blockers.

Persist through implementation, integration and verification. Do not stop after creating the matrices, adding model fields, passing a mocked suite or finding a provider blocker when independent work remains. Do not deploy, publish, merge, run production migrations or contact third parties as part of this prompt.

Claim the first batch complete only when every applicable row is verified. If provider approvals, source decisions or missing later prerequisites prevent completion, deliver all completed independent work and explicitly report partial completion with the exact remaining requirements. Never hide required work in a generic 'future improvements' note or mark missing behaviour complete.
