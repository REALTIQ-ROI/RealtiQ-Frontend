# REALTIQ — Existing Feature Corrections

Working checklist for correcting existing features to match the supplied PRD and specification documents. Most items require frontend and backend work. The combined audit and delivery plan help identify gaps and locate requirements.

## Governing requirements

- The supplied PRD and specification documents define the behaviour to implement now.
- Where they conflict, the detailed specification governs behaviour.
- Follow their exact fields, validation, permissions, workflow stages, provider requirements and acceptance criteria when correcting an existing feature.
- Do not preserve legacy behaviour merely because it was previously implemented or included in the original scope.
- Use the original agreement only to classify retained work versus additional charges; it does not override the current implementation requirements.
- This list covers the current existing-feature correction phase. Grouping the work here does not remove new features or other requirements from the overall PRD/specification scope.

The order below is a suggested implementation sequence, not a committed delivery schedule. Audit findings still require source confirmation and integration verification. Mark an item complete only when its relevant frontend, backend and integration checks pass.

## First batch — Privacy, permissions, listings and discovery

### 1. Private information and document access

- [ ] Prevent unauthorised access to phone numbers, emails and identity documents through screens, APIs, exports and direct links.
- [ ] Enforce permissions on protected property documents.
- [ ] Verify access as a guest, another account and an unauthorised staff member.

### 2. Account permissions

- [ ] Check current account permissions rather than relying only on old login claims.
- [ ] Revoke access immediately for suspended, removed or demoted users.
- [ ] Verify that an existing login session cannot retain revoked access.

### 3. Property listing fields and validation

- [ ] Align forms, stored records, imports and search on property types, area units, currencies, price-on-application and availability.
- [ ] Remove incorrect defaults and forced instalment rules.
- [ ] Migrate affected existing records deliberately.
- [ ] Verify that create, import, reload, search and checkout preserve consistent values.

### 4. Search, filters, maps and saved alerts

- [ ] Correct keyword matching across headline and description.
- [ ] Sort the full matching result set before pagination.
- [ ] Align filters, map results, counts and price handling.
- [ ] Make saved-search alerts respect the selected frequency.
- [ ] Verify matches beyond the first page and agreement between list and map results.

### 5. Existing spreadsheet imports

- [ ] Correct field mapping, row errors and valid/draft handling.
- [ ] Complete progress, retry and re-import behaviour.
- [ ] Prevent duplicates and verify recovery after interruptions.
- [ ] Prevent imports from incorrectly changing sold units.

## Second batch — Transactions and documents

### 6. Enquiries, offers and reservations

- [ ] Record offer versions and require both parties to accept the current terms.
- [ ] Handle expired quotes and changed terms correctly.
- [ ] Prevent two buyers from reserving the same unit.
- [ ] Verify simultaneous reservation attempts and renewed acceptance after changes.

### 7. Checkout and payment status

- [ ] Correct payment routing using approved provider capabilities.
- [ ] Display pending, failed and successful payment states accurately.
- [ ] Handle duplicate callbacks and retries safely; reconcile provider and ledger records.
- [ ] Stop payment alone from marking a property as legally owned.
- [ ] Verify every payment, instalment and escrow completion path.

### 8. Escrow and instalments

- [ ] Confirm actual provider fund releases before showing successful release.
- [ ] Complete release conditions, verification, objections and recovery flows.
- [ ] Complete bilateral instalment terms, early settlement, penalties and refunds.
- [ ] Enforce legal-completion and outstanding-obligation checks.
- [ ] Verify that provider failure cannot produce a successful release record.

### 9. Existing contracts and protected documents

- [ ] Obtain approved legal templates and align existing contract/signature journeys with the supplied PRD and specification.
- [ ] Enforce document-access eligibility and resource permissions.
- [ ] Validate and scan uploaded files; verify protected delivery.
- [ ] Verify that unauthorised access and access-session misuse are denied.

## Third batch — Supporting journeys and release checks

### 10. Existing inspections and tours

- [ ] Complete booking, joining, cancellation and access flows.
- [ ] Complete inspection reports, acceptance and refunds.
- [ ] Verify Matterport and Realsee separately using the required provider accounts/licences.
- [ ] Verify the live inspection journey, including launch Zoom requirements, against the supplied PRD and specification.
- [ ] Track CloudPano and additional access/calendar functionality as required additions in the separate new-feature backlog, preserving their specified delivery requirements.

### 11. Trust, reviews and existing profiles

- [ ] Correct review eligibility, trust badges and privacy.
- [ ] Separate qualifying buyer and seller histories where required.
- [ ] Hide average ratings below the required minimum review count.
- [ ] Verify that private contacts and unsupported trust claims are not displayed.

### 12. Saved properties, notifications, ROI and analytics

- [ ] Align saved/recent property journeys with the supplied PRD and specification.
- [ ] Complete notifications, preferences and saved-search delivery.
- [ ] Verify ROI, valuation and analytics calculations using approved data.
- [ ] Verify the retention requirements in the supplied PRD and specification against the acceptance register.

### 13. Integration and release checks

- [ ] Verify responsive layouts, accessibility, loading states and error handling.
- [ ] Verify uploads and permission regressions.
- [ ] Test complete user journeys with the real database and required provider sandboxes.
- [ ] Verify payment reconciliation, monitoring, backup restore and rollback readiness.
- [ ] Complete agreed user acceptance testing and release rehearsal.

## Legacy scope reconciliation

Offline/PWA, advanced maps/Lidar/heatmaps, public-ledger work, tenancy documents, news/blog/education and broad analytics appeared in the earlier agreement. For the current work, implement these only as required by the supplied PRD/specification or subsequent explicit instructions. Record contractual differences separately; they do not automatically become tasks in this correction phase.

## Scope boundaries and dependencies

New property comparison, social feeds/campaigns, expanded developer hierarchy/bulk transactions, multiple profiles/teams, expanded document issuance, advanced finance, detailed ecosystem architecture and CloudPano are not wholesale existing-feature corrections. Split retained work from the proven increment in each mixed package.

Transaction completion depends on approved provider/custody capabilities, business rules, fees and legal templates. Frontend completion alone does not establish that a workflow is ready for release.

## References

- [Combined current scope](combined-current-scope.md)
- [Delivery plan](realtiq-delivery-plan.md)
- [Action summary](realtiq-action-summary.md)
- [Backend audit](backend-needed-updates.md)
- [Frontend audit](needed-updates.md)

This checklist groups the work for execution. The supplied PRD and specification documents are the source of truth for exact acceptance criteria; the detailed audit registers provide traceability and supporting findings. Check the governing document requirement before implementation and completion sign-off.
