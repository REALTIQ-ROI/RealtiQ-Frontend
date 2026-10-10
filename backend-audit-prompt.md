# REALTIQ backend and combined full-stack scope audit prompt

Copy the prompt below into a new Codex conversation opened in the REALTIQ backend repository.

---

Act as a senior backend architect, QA lead, product requirements analyst and software scope consultant. Audit the existing REALTIQ backend against the product documents and reconcile it with the existing frontend audit. This is analysis only. Do not implement features, change application code/configuration/dependencies/tests, run migrations or seeds, or modify existing audit documents. Create only `backend-needed-updates.md` and, if all required sources and the frontend repository are accessible, `combined-current-scope.md` in the backend root.

## Context and source files

The original total agreed project fee was approximately NGN2,550,000. The outstanding balance is NGN1,020,000; implied amount paid is NGN1,530,000. Payment percentages are not implementation-completion percentages. Additional work must be distinguished from unfinished originally agreed work.

The sibling frontend repository is normally `../realtiq-frontend`. Locate and verify these exact documents there, or locate them elsewhere without guessing:

- `REALTIQ PRD.pdf`
- `REALTIQ Specifications.pdf`
- `REALTIQ Features List Version 2.pdf`
- `needed-updates.md` — existing frontend audit; provisional evidence and classifications, not an authoritative statement of backend status.

Read the entire PRD including appendices first. Then read Specifications front matter sections0.1–0.4 and the full RQS-01 through RQS-08, then the complete original Features List Version2. Verify page counts, extraction, tables, diagrams and appendices. Render and inspect pages where extraction loses information. Disclose unreadable or unexamined material; do not claim full coverage if any source remains unexamined.

For implementation, detailed RQS governs over PRD, but every contradiction remains in a decision register. For commercial scope, Features List Version2 is the baseline. The new specification does not automatically expand the original paid agreement.

## Requirements inventory and traceability

Extract every independently testable backend, database, API, security, integration, operational and launch requirement, including fields, defaults, conditional validation, state transitions, fees, permissions, errors, retries, concurrency and acceptance criteria. Cover every PRD/RQS section with a coverage matrix.

Map each requirement to the existing frontend AUD identifier where applicable. Preserve those identifiers and maintain a crosswalk. Assign stable BE identifiers only where additional backend-specific verification tasks or previously omitted requirements are necessary. Distinguish one shared product requirement from its frontend/backend implementation tasks; do not add both inventories together and call that the unique requirement total. Revalidate frontend scope classifications and flag duplicates, overbroad group classifications or unsupported claims rather than propagating them.

## Backend inspection

Inspect actual entry points, routes, controllers, services, models/indexes, middleware, validators, background jobs, queues/events, webhooks, uploads/object storage, emails/SMS/realtime, payment adapters, provider settings, environment-variable usage, feature flags, Console configuration, migrations, deployment/runbooks and existing tests. Check the actual path from request through authentication, authorisation, validation, persistence and side effects. A named endpoint or passing mocked test does not prove production functionality.

For every requirement record exact file paths, relevant symbols/lines, observed behaviour, matching parts, differences, missing parts and required corrections. Classify separately as verified source implementation, implemented but runtime/provider unverified, partial, incorrect, mock-only, missing, externally blocked or unable to determine. Reserve end-to-end verified for actual authorised integration evidence.

Run existing non-destructive checks where safe after inspecting their scripts. Do not automatically install packages, change lockfiles or repair failures. Do not call production payment APIs, send messages, modify production data, expose credentials, run destructive commands or test against an unknown database. Record commands, results and mock/runtime limitations.

## Deep-review areas

1. RQS-01: project/unit enquiry, buyer/seller negotiation, versioned bilateral terms acceptance, atomic unit locks, concurrent buyers, multi-unit allocation/rounding, per-unit ledgers/refunds/receipts, independent releases, shared milestones, exception units, verification rooms, disputes and developer dashboards.
2. RQS-02–04: complete typed field dictionaries, sqm/currencies/POA/null rules, geographic validation, project/type/unit inheritance and overrides, import jobs and row errors, publication matrices, canonical search projections, full-catalogue strict-AND keywords, location/bounds/facets/sort/pagination and URL contract parity.
3. RQS-05: comparison eligibility, two-to-four sets, persistence/sync, complete attributes, live updates, FX sources/timestamps, recommendations, insights and privacy.
4. RQS-06: one account/multiple profiles, KYC/action eligibility, departments/team seats and resource permissions, agencies/mandates, every Partner service, transaction stages, escrow/instalments, legal completion versus payment, document issuance/signatures/QR/references/access, property register/authority/deduplication/resale, trust/reviews/moderation, notifications, social feeds/posts, promotion, finance and Console.
5. RQS-07: each public profile family and F1–F43 cross-references, visibility, action eligibility, privacy and qualified ratings.
6. RQS-08: every08-* rule and acceptance criterion,23 fee products, provider/stream routing, configurable versioned rates, fee snapshots/allocation/refunds/waivers, recurring plans/renewal/grace/seats, supplier invoicing/VAT/WHT and revenue recognition. Never use test-example fees as approved live prices.
7. PRD section14.9 / RQS-06 section11.4: launch Zoom, Matterport, Realsee and CloudPano independently; live-tour permissions/booking/session links, signed provider data, licences/domain approval and provider errors. Distinguish specified future video foundations and built-disabled charging from operational launch tours. Do not recommend other vendors.
8. PRD section26 / RQS-06 section23: global identifiers, OIDC, durable event/outbox foundations, versioned partner APIs/OpenAPI, OAuth/mTLS, HMAC webhooks/replay/idempotency/retries/dead letters, consent/withdrawal, sandbox, rate limits, audit and Console integration switches. External connections being disabled does not remove the launch foundation requirements.
9. PRD section2.4: list every feature that must be built but disabled; verify default-off flags and inability to charge/use it. Do not silently defer mandatory foundations.
10. Security/NFR: resource-level access, private prices/documents, current-account permissions and token revocation, file validation/scanning/signed URLs, callback authenticity/idempotency/reconciliation, preparation/approval segregation, retention/anonymisation, resilience/observability, performance, backups/restore and deployment/rollback evidence.

The frontend audit reported Paystack property/cart routing, premature Sold/Owned transitions, a single-role account model and legacy taxonomy. Independently recheck these in current source; do not accept them without evidence. Conversely, do not label a backend feature missing because its frontend is missing. Match request/response schemas, field names, status enums, errors, currencies, provider routes and permissions across both repositories.

## Commercial classification

Use S1 explicit original scope; S2 reasonable professional necessity; S3 ordinary clarification; S4 material expansion; S5 entirely new module; S6 new technical/operational obligation; S7 replacement/reversal; S8 uncertain. For each potential addition provide the exact original promise/reference, new behaviour/reference, incremental work, reusable existing implementation, frontend/backend/shared tasks, dependencies, complexity, confidence and suggested treatment. Normal validation, responsive behaviour, essential security/errors and unfinished original escrow/maps/verification/ROI/inspection features are not automatically separately billable. The original ecosystem intent and pending monetisation wording must be considered accurately.

Separate implementation labour from client-paid licences, hosting, provider accounts, capture/content, legal/accounting and operating costs. Do not invent agreed fees, fee values, regulatory approval or third-party capabilities. Any quotation allowance must be explicitly provisional and based on verified incremental effort. Do not quote the same feature twice because it needs both frontend and backend work. Exclude the developer audit-reading page from commercial product requirements unless separately agreed.

## Deliverables

`backend-needed-updates.md` must include: plain-English executive summary; methodology/source completeness; document hierarchy; full coverage matrix; implementation inventory; granular backend gaps and acceptance tasks; frontend/API mismatches; original-versus-added scope; change-request candidates; contradictions and open decisions; client/provider dependencies; security/NFR; launch feasibility/critical path; prioritised roadmap; complete actionable checklist; verification plan; limitations/confidence; reconciled metrics.

If both repositories and all PDFs are accessible, also create `combined-current-scope.md`. Start with a short, plain-English answer to: What already works? What must be corrected? What remains from the original agreement? What is genuinely additional? What depends on the client/provider? In summaries use “section” rather than the symbol §, explain acronyms and group tasks into understandable work packages.

The combined master table must give one primary product requirement ID, original/new source, frontend status/evidence, backend status/evidence, integration/provider status, exact remaining action, priority, acceptance, commercial classification and confidence. Reconcile frontend and backend conclusions, recording corrections to the earlier frontend audit explicitly. Preserve detailed technical appendices while making the implementation and commercial summary readable. Do not calculate completion percentages from file counts, payment percentages or checklist counts.

Provide a shared work breakdown with dependencies, incremental frontend/backend effort ranges and explicit assumptions. Identify what must be live versus built-disabled. Assess31October2026 against the actual current date, available resources and unresolved approvals; do not fabricate a promise or reduce scope to meet the date. If the target has already passed, state that and propose a new planning basis.

Before finishing, independently revisit PRD contents/AppendixA, all RQS headings/platform rules/glossary, Changes from Current sections, Key Decisions, acceptance/edge cases/diagrams, PRD sections2.4/14.9/22/26 and original Features List sections1–9. Reconcile unique requirement counts, status counts, scope counts, gaps, blockers and open decisions. Disclose all unverified deployment/backend/provider claims. Confirm that no application code or existing audit file was changed.

Begin by locating all sources and verifying complete readability. Continue systematically until the permitted reports are finished; do not stop after a plan or sample analysis.
