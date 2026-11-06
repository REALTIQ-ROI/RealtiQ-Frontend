Read the PRD section and its cited Specifications sections.
Mark each requirement backend, frontend, or mixed.
For backend work, implement and document the APIs, data, permissions, validation, and state changes.
For mixed work, give the frontend the confirmed contract, then implement and connect the screens.
Track backend and frontend completion separately against the section’s acceptance criteria.


The PRD is organised by product module, not implementation dependency. It says the Specifications govern if they conflict with the PRD, and Appendix A maps each PRD section to its RQS source. I used that crosswalk and ignored the backend’s current implementation state. [REALTIQ PRD.pdf](C:/Users/DELL/Documents/Samuel-Okiro/RealtiQ/realtiq-backend/REALTIQ%20PRD.pdf) [REALTIQ Specifications.pdf](C:/Users/DELL/Documents/Samuel-Okiro/RealtiQ/realtiq-backend/REALTIQ%20Specifications.pdf)

## Recommended implementation order

### 1. Set product scope and resolve source decisions

**PRD §§1, 2, 23, 25**

Establish which sources govern, what launches, what is explicitly out of scope, and which ambiguities need decisions before their affected features proceed. Section 25 decisions should not block unrelated work.

### 2. Build platform foundations and workspaces

**PRD §§3, 4, 12, 18, 21, 26**

Start with accounts, multiple profiles, access levels, verification, teams and seats; then apply the platform-wide rules and shared portal conventions. Establish the Console’s staff authority, configuration, departments, audit and notification foundations, along with security, accessibility, availability and integration contracts.

Build the shared portal shell here; fill its feature pages as the underlying workflows arrive. Connect Console queues and notifications as each feature is delivered. Section 26 calls for integration-ready contracts at launch, but says connected applications are not themselves in launch scope.

### 3. Establish the shared property vocabulary

**PRD §5**

Define the shared taxonomy and data concepts—property types, build stages, measurements, amenities, title documents, occupancy, locations and price data—before building forms or search. These definitions are reused by listing, project, unit and discovery workflows.

### 4. Build the revenue and payment foundations

**PRD §20**

Create the versioned fee schedule, pricing engine, plan and seat billing, payment routing, tax treatment, invoice and refund rules. Later paid workflows depend on this shared system; don’t create separate fee logic for each feature.

### 5. Build listing, project and unit creation and lifecycle

**PRD §§13, 7, 8 — in that order within the group**

First establish common listing states, the property register, duplicate and relisting rules, mandates and payment-term models (§13). Then implement individual-property onboarding (§7), followed by developer project, unit-type and unit onboarding, inheritance, grid and import workflows (§8).

### 6. Build media, document and viewing capabilities

**PRD §14**

Implement the shared media and document model, access levels, protected document handling, document manager and viewing calendar. These capabilities support listing experiences and provide evidence and access flows used by later transaction and escrow work.

### 7. Build partner, trust and public-identity capabilities

**PRD §§17, 15, 19 — in that order within the group**

Establish partner roles, credentials, services and job workflows (§17); then trust, reputation, social features and promotion rules (§15); then public profile pages that present the authorised profile, partner and trust information (§19).

Define the trust inputs here. Transaction-derived evidence and reputation updates can be connected once the transaction lifecycle is implemented in Group 9.

### 8. Implement search and discovery

**PRD §6**

Build server-side search against the canonical listing data, then maps, filters, sorts, facets, saved searches and alerts. This follows listing creation and the availability of media, trust and Sponsored-placement signals, so those signals can be handled consistently in search.

### 9. Implement negotiation, checkout, escrow and finance

**PRD §§10, 16 — in that order within the group**

Implement enquiries and negotiation, locked terms, checkout, payment allocation, escrow, release and dispute flows (§10), using the payment foundations from §20 and supporting documents, viewing and partner workflows from Groups 6–7. Then build Finance views, reconciliation, payouts, reports and exports on the resulting transaction records (§16).

### 10. Assemble comparison and the project purchase journey

**PRD §§11, 9 — in that order within the group**

Build Compare on top of search, canonical listing data, the property register, price history and transaction outcomes (§11). Then assemble the project page and purchase journey (§9), which brings together units, comparison, documents, viewings, messaging, partners, checkout and escrow.

### 11. Complete pre-launch dependencies and acceptance

**PRD §§22, 24**

Clear the applicable provider, legal, payment, tax, policy and operational prerequisites in §22, then use §24’s acceptance criteria to close each RQS workflow end to end. Track these prerequisites from the beginning; this final stage confirms that each affected feature is ready to activate.

**Cross-cutting note:** §§4 and 21 apply throughout, even though they appear in Group 2. The sequence is a dependency order, not a rule that no work may overlap. For example, portal shells, Console foundations and feature-specific APIs can be developed in parallel once their underlying contracts are agreed. All 26 numbered PRD sections are included above, once each.