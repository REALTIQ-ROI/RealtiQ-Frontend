# REALTIQ — Start Here

This guide explains the supplied frontend, backend and combined reports in plain English. It is a reading and planning guide, not a fresh production audit, signed change order or fixed quotation. The detailed reports remain unchanged.

## 1. What the combined audit actually tells us

**You have a substantial application to build on. You do not need to start again.** Accounts, property/project management, imports, maps, database search, messages, payments, instalments, disputes/refunds, title hashes/access sessions, inspections, two 3D providers, trust and valuation all have reusable source implementation.

**The revised specification is not fully delivered.** Some existing workflows are wrong for the new rules; some modules are absent; some conclusions still need provider, database or production verification.

The frontend's 1,252 records are detailed audit/checklist entries, not 1,252 separately chargeable features. The combined report retains 1,250 primary traceability records after two reviewed overlaps and adds 43 backend verification tasks. It explicitly does not certify an exact count of unique independently testable product requirements. These counts must not be used as a percentage complete or invoice quantity.

The combined report's proposed classifications are more cautious than the first frontend report: 566 records are original scope, professional necessities or ordinary refinements; 132 are material/new/technical additions; six describe reversals; and 546 remain contractually uncertain. These are records, not independent priced products. A large unresolved category is a reason to review the agreement, not a reason to invoice every item.

For the complete reasoning, open [Combined scope](combined-current-scope.md). Use [Backend detail](backend-needed-updates.md) for server evidence and [Frontend detail](needed-updates.md) for the earlier client-side findings.

### What currently exists across frontend and backend

Read “exists” as reusable implementation found in source. It does not mean the entire feature is correct, integrated or approved for production. The combined report's implementation inventory and frontend/API reconciliation provide the supporting file references.

| Area | What already exists | What you must now finish or correct | How to treat the cost |
|---|---|---|---|
| Accounts and identity | Login, role records, KYC uploads and ownership checks. | One identity with multiple profiles; current-account and team permissions; eligibility and revocation. | Basic access/security is original delivery. Expanded profiles/seats need an agreed increment. |
| Listings, projects and units | Property/project models, listing forms, map coordinates and management flows. | One field dictionary, square metres, NGN/USD, POA, type/unit inheritance, overrides, published-only counts and legacy migration. | Correct basic fields within original work; review inheritance and expanded unit modelling separately. |
| Spreadsheet imports | Real staged CSV/XLSX rows, validation, edits and retries. | Background jobs, valid-row/draft handling, complete new fields, atomic duplicates and safe re-import/undo. | Credit existing import implementation before estimating additional capabilities. |
| Search, maps and alerts | Database search, maps, filters and saved-search processing. | All keywords must match; search descriptions; sort before paging; consistent unit filters/prices/counts; respect alert frequency. | Core discovery corrections are retained work. |
| Enquiries and messages | Persistent participant conversations and enquiries. | Versioned offers, acceptance by both parties, fixed checkout quotes, exclusive reservations and the complete legal journey. | Core safe purchasing remains included; expanded bundle negotiation needs review. |
| Payments and checkout | Paystack initialization, signatures, amount checks and cart allocation/retry. | Approved property/basket routing, durable callbacks, accounting reconciliation and correct completion states. | Existing checkout is reusable. Agree provider-change responsibility rather than automatically billing all rework. |
| Escrow and instalments | Escrow/disputes/refunds; instalment schedules, reminders and principal/penalty accounting. | Real custodian-confirmed release, atomic locks, complete conditions/verification rooms, bilateral instalment terms and legal completion. | Original functional escrow/instalments remain owed; shared/bulk milestone increments require agreement. |
| Documents and title records | Hashes, duplicate-title signals, chained records, expiring protected sessions and view-once checks. | Correct identity/access gates, actual protection, canonical authority/resale and full issuer/QR/signature/amendment/archive lifecycle. | Credit title/vault/signature baseline; separate expanded issuance/register workflows. |
| Live inspections and 3D tours | Bookings/proxy jobs and Matterport/Realsee adapters. | Zoom launch integration, CloudPano separately, licences, paid-access checks, cancellations, reports and consistent configurable fees. | Existing inspection and two providers are retained work. Price only agreed provider/workflow additions. |
| Trust, reviews and public profiles | Reviews/trust scoring and legacy professional inspection profiles. | Correct qualifying reviews, privacy, minimum review thresholds, role histories, public-profile fields and agency/service permissions. | Core trust/privacy is retained; expanded agencies/Partner services are mixed-scope increments. |
| Compare | Shared property, location and valuation data can be reused; no complete wired Compare module found. | Compatible two-to-four sets, persistence/sync, full comparison attributes, currency/freshness states and permitted sharing. | Clear new-module candidate; credit shared prerequisites. |
| Social feeds and campaigns | Featured flags, some analytics and moderation foundations. | Posts, Following/Explore, engagement, media rules, confidential reporting and campaigns with safe budgets/refunds. | New/expanded package; Featured flags alone do not satisfy the feed specification. |
| Fees, recurring plans and finance | Payment/receipt records, platform transactions and some settings. | Versioned configurable 23-product/118-rule catalogue, plans/seats, tax/payer/refund rules, supplier invoices and revenue controls. | Mixed and contractually uncertain; confirm prior monetisation agreement and approved values first. |
| Ecosystem foundations | Local identifiers, JWT sessions and Socket.IO are reusable foundations. | Required shared sign-in, global IDs, reliable events, partner APIs/webhooks, consent and Console switches—even when external connections are off. | Detailed architecture is an increment candidate; credit original integration intent. |
| Notifications, operations and QA | Some in-app/email retries, rate limiting and existing tests. | Channel adapters/preferences, safe uploads, restore/rollback drills, monitoring, real provider/database tests and end-to-end UAT. | Normal reliable delivery is included; new operational obligations need itemised review. |

**The important correction to the first audit:** database search, project imports, protected document sessions, title hashes, escrow/refund logic and two tour adapters are not wholly absent. Build on them. The missing modules and wrong request paths still require work across both repositories.

## 2. The urgent corrections — fix these first

The following findings are reported by the backend/combined audit. They need bounded source confirmation and isolated integration tests before release; this guide does not claim a new runtime verification.

| Problem in plain English | What to implement or correct | What proves it is fixed | Commercial boundary |
|---|---|---|---|
| Private contacts and identity material can appear in inappropriate responses. | Remove other-party phone/email and confidential identity material from public responses, exports and documents; apply permissions on the server. | A guest, another account and an unauthorised staff member cannot retrieve the private fields, even by calling the API directly. | Normal privacy/security is original professional delivery, not automatically a new module. |
| A signed token can retain old permissions. | Check the current account/profile/seat and revoke access when it is removed or changed. | A removed or demoted account/seat is denied with its old token. | Basic access protection is included; new multi-profile and team models are separately reviewed. |
| Payment can make the property Sold/Owned too early. | Separate payment status from legal transfer and completion; correct every payment, instalment and escrow completion path. | A paid property stays in the appropriate incomplete stage until transfer, escrow and other obligations are satisfied. | Correct core purchasing rather than charge for a whole new purchasing module. |
| Normal escrow release updates records without an evidenced provider release call. | Connect release to the authorised custodian/provider, handle failures/retries, and reconcile the actual movement before declaring success. | A simulated provider failure never produces a successful released ledger; successful provider and ledger records agree. | Functional core escrow was already promised. New shared/bulk milestone behaviour is an increment. |
| Property and service-basket payment routing conflicts with the new specification. | Define approved provider accounts/capabilities; route each payment type correctly; preserve allowed Paystack uses. | Approved sandbox callbacks/refunds and totals reconcile, including duplicate events. | The provider replacement boundary needs agreement; do not automatically bill developer-choice rework. |
| Buyers can pay without the complete accepted terms and exclusive unit lock. | Save versioned buyer/seller acceptance, produce a fixed checkout quote, and lock the unit atomically. | Two simultaneous buyers cannot obtain the same unit lock; changed terms require renewed acceptance. | Basic safe purchasing is retained work; complex bundle negotiation is additional-scope review. |
| Search can return or sort the wrong properties. | Correct full-database keyword matching, normalised prices, ordering before pagination, effective unit filters and alert schedules. | Results outside the first page are found; global ordering/counts/maps agree; alerts respect selected frequency. | Core discovery is original scope and ordinary refinement. |
| Property fields differ between frontend and backend. | Agree one dictionary for types, stages, areas, currencies, POA and inherited fields; migrate old records deliberately. | Form, stored record, import, search, cards and checkout show the same meaning. | Basic field correctness is retained work; project/type/unit inheritance is an expansion candidate. |

Evidence owners: the combined report's “Implementation inventory and request-path findings,” “Frontend/API reconciliation” and BE task register. Priority is protecting money, identity and private documents before adding social polish.

## 3. What remains inside the original agreement

These were not made new merely by being incomplete:

- Core buyer/seller enquiries, communication and purchase workflows.
- Conditional escrow, milestone instalments, refunds and dispute handling to a functional standard.
- Property/project facts, maps, filters and usable imports where already agreed.
- Title hashing/verification, trust/ratings and protected document access.
- Original contract-generation/e-signature commitments, subject to approved legal templates.
- Proxy live inspection and signed condition-report commitments.
- Matterport/Realsee and the originally accepted media/viewer approach.
- ROI, valuation, analytics, saved searches, notifications and other retention obligations.
- Normal validation, error handling, permissions, responsiveness, integration and QA needed to make agreed features work.

The original baseline also names offline/PWA behaviour, advanced maps/Lidar/heatmaps, public-ledger work, tenancy documents, news/blog/education and broad analytics. Some newer instructions omit or reverse these. **Obtain a written retained/replaced/excluded decision; do not silently cancel them or re-bill unfinished original work.**

Your original fee was approximately **₦2,550,000**. With **₦1,020,000** remaining, the implied paid amount is **₦1,530,000**. That balance belongs to the original agreement. It does not measure how much engineering is complete and should not be silently reassigned to new work.

## 4. The additions to discuss in a supplementary quotation

| Package | The specific additional outcome | What to credit or keep outside the extra bill |
|---|---|---|
| Compare | Two-to-four compatible properties; complete attributes, saved/synchronised sets, currency/freshness states, insights and permitted sharing. | Reuse existing property data, search, media and valuation; do not price them again as newly built foundations. |
| Social and campaigns | Seller/partner posts, Following/Explore feeds, engagement, moderation, sponsored campaigns and budget controls. | A blog or Featured flag is reusable work but does not provide a complete social network. |
| Developer inventory and bulk transactions | Type templates and inherited unit values; bundle negotiation; per-unit allocations; shared milestones with independent exception/refund handling. | Credit current project models/imports, basic listings, cart/accounting and original escrow/instalments. |
| Expanded agency/partner/team operation | Multiple profiles, agencies/mandates, team seats/resource permissions and additional professional service workflows. | Credit original company/individual accounts and inspection-partner code; ordinary account security remains included. |
| Expanded document/register operation | Issuer-specific document lifecycle, references/QR, amendments, approval/signature/archives and broader authority/resale workflows. | Core vaults, original legal agreements/signatures, hashes and existing access sessions are already baseline/reusable work. |
| Advanced monetisation and finance | Approved versioned fees, recurring plans/seats, supplier invoices, refunds/waivers, tax configuration and financial/revenue controls. | Original monetisation wording was pending. Confirm which details were subsequently agreed; keep basic payment corrections separate. |
| Detailed ecosystem foundation | The required shared sign-in, identifiers, events, partner APIs, webhooks, consent, sandbox and controlled integration switches. | General ecosystem integration intent already existed; quote the proven detailed increment with that credit. External apps being off does not waive foundations. |
| Additional provider/access behaviour | CloudPano plus explicitly expanded access/calendar capabilities not already covered. | Matterport/Realsee and original live proxy inspection are not entirely new modules. Zoom launch work may fulfil existing obligations. |
| Approved reversals | Documented changes such as default map behaviour, tenancy removal or always-Free plans, with identifiable rework. | No automatic extra invoice for correcting a developer implementation choice; agree the original/new boundary and credit removed work. |

These are quotation candidates, not automatically approved charges. Agree exact acceptance and exclusions, and avoid charging both “frontend Compare” and “backend Compare” as two separate products. Both are parts of one deliverable.

## 5. Pricing — what can responsibly be said now

**Do not send my earlier ₦2.2–₦3.9 million allowance or ₦3 million suggestion as a fixed quotation.** They were preliminary discussion figures before the supplied backend report. That report describes broader work and still has substantial contractual and implementation uncertainty. It does not certify a monetary quote.

The combined report supplies provisional person-day ranges. One person-day means six productive engineering hours, not one calendar day. Its complete programme allowance is 133–245 frontend days, 236–418 backend days and 122–216 QA/infrastructure days: **491–879 person-days in total**. These broad allowances include originally owed work, uncertain/mixed packages and further verification. They are not a validated ticket estimate or an amount to bill as additions.

| Example package from the supplied report | Frontend + backend + QA allowance | Important boundary |
|---|---|---|
| Compare | 31–54 person-days | New module; prerequisite shared data work is owned elsewhere. |
| Social/publication/campaign increment | 48–84 person-days | Split new social work from reused moderation/Featured/analytics. |
| Developer bulk/shared-milestone increment | 51–93 person-days | Existing listings/imports/escrow are credited. |
| Expanded profiles/agencies/partners | 49–88 person-days | Mixed with original account/inspection obligations; not all days automatically additional. |
| Fee/recurring/tax/advanced-finance increment | 68–117 person-days | Commercial boundary unresolved where previous monetisation agreement is missing. |
| Ecosystem foundations | 38–68 person-days | Credit original integration intent; approve exact additional architecture. |

The guide's optional calculator applies a rate you enter to the supplied package allowances. It is an arithmetic planning aid, not a market-rate recommendation, invoice or validated fixed quote. Selecting a mixed package does not settle its billable boundary.

Use this process:

1. Identify the agreed additions and split mixed packages into original, new and approved rework.
2. Confirm the actual engineering tasks and reuse with both repositories; remove overlapping shared work.
3. Estimate development, integration and QA for those agreed increments. Test risky provider/database assumptions first.
4. Apply your sustainable daily rates, then explicitly state margin/risk allowance, tax treatment, exclusions and payment milestones.
5. Have the client approve the supplementary scope and delivery plan before committing to the extra work.

**Example only:** if both parties agree one additional package needs 40 person-days at ₦25,000/day, its labour subtotal is ₦1,000,000. That example supplies no claim about your actual rate, margins, tax or any REALTIQ package's verified effort. Use different engineering/QA rates if appropriate.

Keep the **₦1,020,000 original balance** and the new approved amount as separate line items. Licences, hosting/storage, emails/SMS, media capture, legal/accounting approvals and operating staff are separate costs with named owners. Do not treat them as included or approved without agreement.

## 6. Implementation order and client decisions

### Phase A — Decide the rules and prove risky integrations

Agree custody/payment capabilities, fees/tax/payers, profile/seat permissions, property dictionaries, publication rules and legal-completion events. Obtain provider sandbox accounts and counsel-approved templates. These decisions unblock coding; developers must not invent live fees or legal authority.

### Phase B — Repair the shared foundations

Protect private data and current-account access; define compatible APIs/statuses/errors; migrate typed listing/unit data; correct canonical search and published-only counts. Document how old records will change, including inconsistent account and ownership history.

### Phase C — Complete reliable transactions

Implement bilateral terms and exclusive unit locks, immutable quoted amounts, provider-confirmed movement, payment/escrow/instalment/refund reconciliation and proper legal completion. Validate duplicate callbacks and failure recovery with an isolated database and sandbox.

### Phase D — Deliver the approved product expansions

Build developer bulk workflows, profiles/partners, documents, Compare, social, fee/finance and ecosystem increments on the stable contracts. Parallel work is possible, but each stream needs a shared owner for identities, fees, events and permissions.

### Phase E — Verify and release

Run frontend/backend permission and integration tests, actual specified provider acceptance, realistic performance, backup/restore and client UAT. Test built-disabled features cannot be activated or charged by bypassing the UI. Do not mark the product launched because a build or mocked test suite passes.

Before final commitment, get decisions on: approved price/fee/tax values; currency conversion and settlement; verification badge versus identity eligibility; POA/mandatory fields/photos; agency payer liability; approval thresholds; old contractual obligations; provider licences/credentials; legal templates; team capacity and UAT owners. The combined report contains 24 composite decision records plus 15 source decision records; some overlap.

## 7. Launch date and unresolved evidence

The reports are dated **10 October 2026**, when the 31 October target was 21 calendar days away. Neither report supports a full-specification launch commitment for that date.

The backend report explicitly does not validate the first frontend report's 12–20-week forecast. Its provisional backend allowance alone corresponds to approximately 24–42 working weeks with two dedicated backend engineers, before approval waiting and sequencing. That is an allowance, not a guaranteed schedule. Set a date from an agreed backlog, named capacity and proof of risky integrations, not from either headline range.

The supplied backend report also identifies **clipped specification text on physical pages 5, 75, 95 and 148**. This corrects the earlier frontend audit's overly confident source-completeness statement. Obtain corrected source pages; do not guess the missing words or call source coverage complete while they remain unresolved.

The backend audit reports **225 local tests passed**, with production/external providers and database connections blocked or mocked. That is useful evidence about existing tests; it does not certify deployed database behaviour, custody, licences, email/SMS, real tour providers or operational performance. The historical load test is not current production certification.

This summary reviews the reports' narrative findings and work breakdown. It does not independently re-read every detailed row or re-audit all application code. The source classifications and broad effort allowances need task-level verification and client agreement before becoming a final scope, fixed price or launch sign-off.

## 8. Words and symbols explained

| Term | Plain meaning |
|---|---|
| § | Section. “RQS-06 §23” means section 23 of the Portals specification. |
| PRD | Product Requirements Document: what the product should do. |
| RQS | A numbered part of the detailed specification; exact behaviour takes precedence over the PRD. |
| AUD / BE | Audit requirement/reference and additional backend verification task identifiers. They are tracking labels, not invoice quantities. |
| API | The request/response contract between the frontend and server. |
| POA | Price on application; display “ask for price,” not a fake zero amount. |
| KYC | Identity and eligibility checks. Paying for a property badge is a different concept. |
| S1–S3 | Original promised work, necessary professional delivery or ordinary refinement. Normally retained work. |
| S4–S6 | Material expansion, new module or new technical/operational obligation. Review the incremental billable boundary. |
| S7 | A replacement or reversal; agree what rework and removed effort count. |
| S8 | Contractually unclear. Discuss and record the decision; do not automatically charge. |
| P0 | Launch blocker or critical prerequisite. |
| P1 / P2 | Required launch work with different sequencing/dependency urgency; not optional. |
| P3 | Lower activation risk/polish or built-disabled work; mandatory foundations are still due. |
| Idempotent | Retrying the same event does not charge, release or refund money twice. |
| Atomic lock | The server ensures only one buyer can win the same unit reservation. |
| Outbox/webhook | Reliable records and delivery of events between systems. |
| OIDC | The shared sign-in protocol required for the specified ecosystem. |

## 9. A practical message to the client

> The original ₦2,550,000 agreement remains, with ₦1,020,000 outstanding. We now have frontend and backend audits identifying existing work, original-scope corrections and additional capabilities. Compare and social publishing are new-module candidates; bulk developer transactions, expanded partners, documents/finance and detailed ecosystem infrastructure contain substantial additions. I will credit existing implementation and separate original obligations from each proposed increment. We need to approve the business/provider decisions and an itemised supplementary scope before confirming the additional price and full delivery date.

Next working document: a signed work-package list stating exact outcome, original/new boundary, reused implementation, estimated effort, dependencies, acceptance and price. The combined report is the technical reference for creating that list, not an already agreed invoice.
