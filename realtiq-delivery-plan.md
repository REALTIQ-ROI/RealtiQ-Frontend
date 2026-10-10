# REALTIQ — New Features, Improvements and Quotation

This is the practical delivery view of the supplied reports. **Frontend** means screens and browser behaviour. **Backend** means APIs, permissions, stored data, jobs and financial processing. **Both** means one feature delivered across those two parts, charged once. QA and provider testing are part of delivery.

The detailed specification governs behaviour where it disagrees with the PRD. The original Features List Version 2 governs whether work was already paid for. This document summarises those sources through the supplied combined audit; it does not replace their detailed fields, exceptions or acceptance criteria.

## 1. New features to add

These packages describe new functionality, not whole modules to rebuild from scratch. “Candidate” means the documentary comparison supports a supplementary scope discussion; it does not mean a signed change order exists. Rows N03–N09 contain mixed or disputed boundaries and must not be invoiced wholesale.

#### N01 — Full property comparison

**Where to implement:** Both

**Frontend:** Selection/tray, compatible two-to-four sets, complete comparison table, replacement prompts, saved/shared states, currency/freshness and privacy states.

**Backend:** Store/synchronise comparison sets; permitted sharing and alerts; effective attributes, FX/freshness and consented insight events.

**Scope and source:** New-module candidate. RQS-05 sections 1–5, 12, 14–17, physical pages 88–95; PRD chapter 11. Original section 9, page 5 covers retention, not Compare. Combined WP8 / CR1; AUD-RQS05-0001 onward.

#### N02 — Social publishing, Following/Explore and campaigns

**Where to implement:** Both

**Frontend:** Authorised seller/partner posts, media controls, feeds, follow/engagement actions, reporting and campaign management.

**Backend:** Posts/follows/engagement persistence, feed rules, moderation privacy, sponsored budgets/spend/refunds and authorised events.

**Scope and source:** New social module and campaign increment. Credit existing Featured/moderation/analytics. RQS-06 social/feed/promotion requirements; original section 9, page 5 covers blog/retention rather than social authoring. Combined WP9 / CR2.

#### N03 — Developer hierarchy and bulk purchase workflows

**Where to implement:** Both

**Frontend:** Project → unit type → individual-unit editing/inheritance; bundle negotiation; per-unit allocation and shared-milestone/exception views.

**Backend:** Effective inheritance/overrides; searchable unit records; background imports; bundle terms/atomic locks, unit allocations and independent milestone/refund exceptions.

**Scope and source:** Material increment; credit existing project forms, staged CSV/XLSX imports and original escrow/instalments. RQS-01/RQS-02; PRD chapters 8–9. Original sections 1 and 2–5. Combined WP4 / CR3. Basic field corrections belong in improvements below.

#### N04 — Multiple profiles, agencies, teams and expanded Partner services

**Where to implement:** Both

**Frontend:** Profile switching; agency/mandate/seat/department workspaces; specified public profiles and service-specific delivery screens.

**Backend:** Shared identity/profile graph, resource permissions, mandates, credentials/expiry, service workflows and private public-response projections.

**Scope and source:** Expanded scope; credit existing accounts, inspection profiles and core communication. RQS-06/RQS-07, public-profile F1–F43; PRD chapters 3/19. Original sections 2/6/8. Combined WP5 / CR4.

#### N05 — Expanded document issuance and property authority lifecycle

**Where to implement:** Both

**Frontend:** Issuer/template/reference/QR/signature flows; amendment, archive and authority/resale views.

**Backend:** Document lifecycle, authorised issuance/signatures, immutable records and canonical authority/deduplication/resale.

**Scope and source:** Increment only: vaults, core sale/tenancy contracts, signatures, title hashes and protected access were baseline. RQS-06 document/register requirements; original sections 2/5. Combined WP6 / part CR5. Legal templates/issuer decisions required.

#### N06 — Advanced fees, recurring plans and finance

**Where to implement:** Both

**Frontend:** Versioned Console configuration, plans/seats, invoices, refund/waiver and finance/revenue controls.

**Backend:** The specified 23-product/118-rule engine, quote snapshots, renewals/grace, payer/refund rules, tax/invoices and earned/deferred revenue.

**Scope and source:** Boundary unresolved: original section 1, page 1 leaves monetisation pending. Obtain subsequent agreements before pricing the increment. RQS-08 sections 1–4/13–16, physical pages 151–168; PRD chapter 20. Combined WP10 / part CR5. Do not invent live fees or tax values.

#### N07 — Detailed ecosystem foundations

**Where to implement:** Both, backend-led

**Frontend:** Console integration switches, consent/authorisation and integration status/configuration surfaces.

**Backend:** Global IDs, shared sign-in/OIDC, reliable events/outbox, versioned partner APIs, scoped security, signed webhooks/retries, consent, sandbox and auditability.

**Scope and source:** Credit original ecosystem intent in section 8, page 5. Detailed new architecture needs an agreed incremental boundary. PRD chapter 26; RQS-06 section 23. Combined WP11 / CR6. Foundations must exist even when external connections are disabled.

#### N08 — CloudPano and expanded tour/access/calendar capabilities

**Where to implement:** Both

**Frontend:** CloudPano viewer/provider states and specified access/calendar flows.

**Backend:** Separate provider configuration/adapters, entitlement and booking/calendar enforcement.

**Scope and source:** Only proven increments: original section 3, pages 1–2 includes Matterport/Realsee; original section 2 includes live proxy inspection. Zoom launch work cannot automatically be charged as entirely new. PRD section 14.9; RQS-06 section 11.4. Combined part WP7 / CR8.

#### N09 — Approved replacements and additional operational obligations

**Where to implement:** Depends on each approved change

**Frontend:** Rework only the identified affected behaviour; show revised states/configuration.

**Backend:** Migrate affected data/rules; implement any expressly added operational targets or integrations.

**Scope and source:** Negotiation required. Combined CR7, WP2/6/13; original map/PostGIS/offline/public-ledger/tenancy commitments must be reconciled. No automatic charge for developer-choice rework or normal security/QA.


**There is no evidence here that an entire newly added package is frontend-only.** N07 is mainly backend work but still needs Console/consent frontend work. A specific backend-only correction appears in the next section. Never count the frontend and backend of one package as two separately quoted products.

## 2. Existing features that need improvement or correction

These are required delivery tasks. Incomplete original work, ordinary validation/security and essential integration are not automatically supplementary charges.

#### I01 — Protect private contacts and identity documents

**Where to implement:** Backend-led; frontend cleanup too

**Frontend:** Remove unauthorised contact/identity displays and links.

**Backend:** Fix public/other-party DTOs, exports, document access and permissions.

**Completion proof and scope:** Guest/other accounts cannot fetch private material by direct API. Original privacy/security correction.

#### I02 — Enforce current permissions

**Where to implement:** Both

**Frontend:** Correct denied/expired/profile states; stop relying on stale role claims.

**Backend:** Check current account/seat/resource permissions and revoke stale sessions.

**Completion proof and scope:** Removed/demoted account is denied with its old token. Basic safety retained; new team/profile model is N04.

#### I03 — Make listing and unit fields consistent

**Where to implement:** Both

**Frontend:** Correct types, area units, currencies, POA, defaults, validation and dependent fields.

**Backend:** Canonical schema, validation, published-only aggregates and deliberate migration.

**Completion proof and scope:** Create/import/reload/search/checkout preserve identical meanings. Original facts/forms refined by RQS-01/02/04; hierarchy expansion is N03.

#### I04 — Correct search, maps and saved alerts

**Where to implement:** Both; scheduling fix backend-only

**Frontend:** Send canonical filters; show correct counts, pages, map results, POA/FX and saved preferences.

**Backend:** Strict-AND headline/description search, global sort before paging, consistent effective-unit predicates/FX and scheduled alert frequency.

**Completion proof and scope:** Out-of-page matches found; sort/maps/counts agree; alerts respect frequency. RQS-03 / original map/retention scope.

#### I05 — Finish imports safely

**Where to implement:** Both

**Frontend:** Complete new-field mapping, row errors, valid/draft states, progress/retry and re-import confirmation.

**Backend:** Background jobs/leases, atomic deduplication, restart safety and sold-unit guards.

**Completion proof and scope:** Mixed rows/retries/restarts behave exactly as specified. Existing staged import is real; separate N03 increment from retained correctness.

#### I06 — Correct enquiries, terms and reservations

**Where to implement:** Both

**Frontend:** Offer versions, both-party acceptance, quote expiry/conflict and reservation stages.

**Backend:** Immutable terms/quotes and exclusive atomic unit locks.

**Completion proof and scope:** Two buyers cannot reserve the same unit; changed terms require renewed acceptance. Original safe purchasing; bundle extension N03.

#### I07 — Correct checkout and payment completion

**Where to implement:** Both, backend-led

**Frontend:** Use the approved quote/routing contract; show pending/failure/paid rather than premature ownership.

**Backend:** Approved provider streams, durable/idempotent callbacks, unit allocations and ledger reconciliation; correct all Sold/Owned paths.

**Completion proof and scope:** Replay/failure/refund tests reconcile; payment alone never grants legal ownership. Original escrow/payment functionality; provider replacement boundary needs agreement.

#### I08 — Complete escrow release and instalments

**Where to implement:** Both, backend-led

**Frontend:** Conditions/verification rooms, payment/release stages, early settlement, objections and recovery states.

**Backend:** Real custodian-confirmed movement, correct release state machine, seller terms, snapshotted penalties and completion gates.

**Completion proof and scope:** Provider failure cannot create released funds; no ownership before legal completion/obligations. Original section 1; shared milestone extension N03.

#### I09 — Correct protected documents and complete baseline contracts

**Where to implement:** Both

**Frontend:** Eligibility/access/error states and approved contract/signature journeys.

**Backend:** Enforce verified eligibility, scan/validate files, resource access and real protected delivery.

**Completion proof and scope:** Guest/session misuse denied; required baseline agreement/signatures verified. Original section 5; expanded lifecycle N05.

#### I10 — Finish launch live/3D inspection journeys

**Where to implement:** Both

**Frontend:** Zoom launch booking/join flows; viewer/loading/error/cancel states; report/acceptance screens.

**Backend:** Booking expiry/permissions, paid viewer entitlement, configurable fees and inspection/report/refund processing.

**Completion proof and scope:** Test licensed Matterport, Realsee and launch Zoom separately; CloudPano is independently required. PRD 14.9 / RQS-06 11.4; retained inspection scope plus N08 increment.

#### I11 — Correct trust/reviews and existing profiles

**Where to implement:** Both

**Frontend:** Correct badge/tier/privacy/eligibility display; hide averages below the required review threshold.

**Backend:** Qualify review/ownership histories, separate buyer/seller trust and public projections.

**Completion proof and scope:** Ineligible/paid trust and private contacts never leak. Original section 2; expanded profiles/services N04.

#### I12 — Complete retention, ROI and original map/offline obligations

**Where to implement:** Both; infrastructure/data providers too

**Frontend:** Required saved/recent/notification/analytics/ROI and retained offline/map/content journeys.

**Backend:** Canonical alerts, durable channels, approved valuation data and retained sync/reporting capabilities.

**Completion proof and scope:** Meet original sections 4/7/9 unless a signed replacement/exclusion exists. New omissions do not cancel old obligations.

#### I13 — Verify integration, security and operations

**Where to implement:** Both; infrastructure

**Frontend:** Accessible/responsive states, permission regressions and complete user journeys.

**Backend:** Safe uploads, observability, restore/rollback, real database/provider tests and operational configuration.

**Completion proof and scope:** Integrated functional/security/load/restore/UAT passes, including built-disabled server gates. Normal QA retained; expressly new operational targets reviewed separately.


Traceability: combined report “Implementation inventory and request-path findings,” “Frontend/API reconciliation,” shared WP1–13 and 43 backend verification tasks; original baseline sections 1–9. Exact detailed acceptance remains in the original AUD crosswalk. These grouped improvements are not replacements for its scalar checklist.

## 3. Supplementary quotation — new work only

**The documents do not contain your development rate or a supplementary contract price.** They specify product behaviour and fees charged to platform users, which are not your development charges. A responsible quotation uses agreed extra tasks and your rate. Your rate and actual team capacity have been requested; until supplied, monetary totals and a committed date remain pending.

| Quote line | Frontend days | Backend days | QA/infrastructure days | Total person-days | Price calculation | Treatment |
|---|---|---|---|---|---|---|
| Q01 / N01 — Compare, combined WP8 | 12–20 | 12–22 | 7–12 | 31–54 | FE days × FE rate + BE days × BE rate + QA days × QA rate | New-module candidate; shared data/identity/notification prerequisites charged once in their owning package. |
| Q02 / N02 — Social/campaign increment, combined WP9 | 16–28 | 22–38 | 10–18 | 48–84 | Same role-specific calculation | Credit existing Featured/moderation/analytics; approve incremental boundary. |
| Candidate subtotal Q01 + Q02 | 28–48 | 34–60 | 17–30 | 79–138 | If one uniform rate R is agreed: 79R–138R | Labour allowance only, not a fixed-price promise or an agreed invoice. |
| Q03 — N03 developer expansion, WP4 | 14–26 | 25–45 | 12–22 | 51–93 | Price only the agreed increment | Credit import/project/payment code. |
| Q04 — N04 profile/Partner package, WP5 | 15–28 | 24–42 | 10–18 | 49–88 | Split retained versus additional tasks first | Mixed package; whole allowance is not automatically extra. |
| Q05 — N05 expanded document package, WP6 | 10–20 | 20–35 | 8–15 | 38–70 | Split baseline contracts/vault from expansion first | Counsel/issuer decisions required. |
| Q06 — N06 advanced fee/finance package, WP10 | 18–32 | 35–60 | 15–25 | 68–117 | Agree missing monetisation boundary first | Tax/provider/business values must be approved. |
| Q07 — N07 ecosystem package, WP11 | 6–12 | 22–38 | 10–18 | 38–68 | Credit original ecosystem intent first | Detailed technical increment, not all integration work rebilled. |
| Q08 — N08 tour/access increment, part WP7 | Not separated | Not separated | Not separated | Not separately estimated | Estimate the increment only | Whole WP7 is 23–41 days and includes original tour work; do not quote its whole allowance as CloudPano. |
| Q09 — N09 approved rework/operations | Pending | Pending | Pending | Pending | Estimate each agreed change | No invented allowance. |

One person-day means **six productive hours** in the supplied combined report. These are that report's provisional ranges, not figures stated by the client PDFs or newly measured ticket estimates. Do not add all mixed rows into a supposedly confirmed new-scope total. Existing data/security/money prerequisites, migration, legal/provider waiting and remaining baseline work must also be planned.

Original agreement: approximately **₦2,550,000**. Outstanding original balance: **₦1,020,000**. Keep that balance as a separate invoice line; do not treat it as the price for these additions. No assumption is made about tax, margin, licences, hosting, provider fees, legal costs or recurring operations. State them explicitly in the quotation when approved. The earlier ₦3 million suggestion is not a document-backed fixed quote.

The calculator below can price selected package allowances using your own rate. For a mixed package, its percentage is an explicit planning assumption; replace that shortcut with task-by-task original/new separation before issuing a fixed quotation.

## 4. Timeline and delivery order

**There is no defensible committed calendar date until staffing, agreed boundaries and blocking approvals are confirmed.** All specified launch features and built-disabled foundations remain due. A timeline for just Compare/social is not a timeline for the whole product.

| Order | What must happen | Responsible parts | Why it comes first |
|---|---|---|---|
| A | Approve custody/provider capabilities, legal completion, fees/tax, field dictionaries, identity/permission policies and original-scope reversals. Obtain corrected clipped source pages and provider accounts. | Client/business/legal/provider owners with FE/BE leads | Developers must not invent business rules, fees or regulatory permissions. |
| B | I01–I05: privacy/permissions, canonical data/migration, search and import contracts. | FE + BE; backend-led security/data | All new modules rely on trustworthy shared identity/property data. |
| C | I06–I09: bilateral terms, locks, immutable quotes, payment/escrow/instalments, protected documents and legal completion. | FE + BE + QA + custody provider | Fix money/ownership before expanding bundle, fee and document workflows. |
| D | N01–N08 and I10–I12 in approved parallel streams, after their prerequisite contracts are stable. | FE + BE + QA; providers where specified | No silent deferral of difficult required features. Credit shared work once. |
| E | I13: all live and built-disabled acceptance, real providers/database, permissions, performance, restore/rollback, UAT and release rehearsal. | FE + BE + QA + operations + client | Mocked unit tests and successful builds do not establish launch readiness. |

For **Q01+Q02 only**, assuming one dedicated frontend engineer, one dedicated backend engineer, one dedicated QA person, five six-hour productive days per week, all prerequisites already complete, and QA performed after engineering: the backend allowance of 34–60 days plus QA of 17–30 days gives a rough **10.2–18 working-week planning envelope**. Frontend requires 28–48 days in parallel. This arithmetic excludes baseline repairs, dependency waiting and other mandatory modules; it is neither a guaranteed finish date nor a source-document deadline. Different staffing or QA sequencing changes it.

For the **whole remaining programme**, the supplied report allows 133–245 frontend, 236–418 backend and 122–216 QA/infrastructure person-days, including original and mixed work. Its backend allowance alone is roughly **24–42 working weeks with two dedicated backend engineers**, before approval waiting and sequencing. The report does not support a fully compliant 31 October 2026 release or certify the earlier 12–20-week full-product forecast. Select a new full delivery date from an approved backlog and actual capacity after the money/data/identity proof milestone.

## 5. Source references and unresolved decisions

- [Combined current scope](combined-current-scope.md): primary current implementation/commercial reconciliation, WP1–13, CR1–CR8, master AUD entries and backend tasks.
- [Backend audit](backend-needed-updates.md): source evidence and original section/page comparison.
- [Earlier frontend audit](needed-updates.md): detailed client-side checklist, subject to combined corrections.
- [Longer explanatory guide](realtiq-action-summary.md): glossary and background if needed.

Outstanding before a firm quote: your role-specific rates, actual team availability, approved original/new boundaries for mixed packages, subsequent monetisation agreements, custodian/provider approvals, tax/fees/FX, legal templates/issuer authority, retained or removed baseline promises and UAT owners.

The backend report identifies clipped Specifications text on physical pages **5, 75, 95 and 148**. Obtain corrected pages rather than guessing the missing content. This delivery view is based on supplied reports and does not independently certify every source sentence, deployed integration or unique atomic requirement count. Keep the full detailed reports as the acceptance registers; no requirement is removed by grouping it here.
