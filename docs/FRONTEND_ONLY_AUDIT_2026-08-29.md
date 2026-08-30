# RealtIQ Frontend-Only Audit

**Audit date:** 29 August 2026  
**Scope:** Issues that can be addressed entirely within the frontend repository.

## Scope exclusions

This audit excludes missing backend features, backend contract changes, third-party credentials, external datasets, and roadmap work that cannot currently be completed from the frontend alone.

The review covers UX consistency, accessibility, responsive behavior, routing, client state, rendering, validation, error handling, performance, and frontend tests.

## High-priority findings

### 1. Initial JavaScript bundle is too large

`src/routes/AppRoutes.tsx` eagerly imports nearly every public, buyer, landlord, inspector, and admin screen.

Production output:

- Main bundle: approximately 3.74 MB minified.
- Main bundle: approximately 982 KB compressed.
- Virtual-tour dependencies create several additional large chunks.

Recommended changes:

- Convert screen imports to `React.lazy`.
- Add route-level `Suspense` fallbacks.
- Separate public, buyer, landlord, inspector, and admin bundles.
- Load Matterport and Realsee only when a virtual tour is opened.

### 2. Several forms rely on placeholders instead of accessible labels

Examples:

- `src/pages/public/ProjectProperties.tsx`
- `src/pages/public/Projects.tsx`
- `src/components/property/ConstructionUpdateManager.tsx`
- `src/pages/dashboard/Admin/ManageProperties.tsx`

Recommended changes:

- Add visible labels or appropriate `aria-label` values.
- Associate labels with stable IDs.
- Group related filters using `fieldset` and `legend`.
- Add accessible names to filter select elements.

### 3. Buyer dashboard logs inquiry responses

`src/pages/dashboard/Buyer/BuyerDashboard.tsx` logs the complete inquiry response:

```ts
console.log('[BuyerDashboard] GET /api/inquiries response:', response);
```

Inquiry responses may contain user or property information. Remove this logging from production code.

### 4. Missing badge data is presented as “No badge yet”

`src/components/trust/SellerTrustBadge.tsx` treats an explicit `none` badge and missing badge information identically.

Recommended behavior:

- `none`: “No badge yet.”
- `undefined` or `null`: “Badge unavailable.”
- `bronze`, `silver`, or `gold`: show the earned badge.
- Type `User.trustBadge` with the existing `TrustBadge` enum instead of `string`.

### 5. Trust checklist completion is too permissive

`src/components/trust/TrustProgressChecklist.tsx` marks an item complete whenever its score is greater than zero. A low score can therefore appear fully completed.

Recommended changes:

- Separate “started,” “evidence recorded,” and “completed.”
- Use record counts for history-based steps.
- Do not treat every positive score as full completion.
- Make the progress bar represent actual checklist states.

## Medium-priority findings

### 6. Unknown routes silently redirect home

The wildcard route in `src/routes/AppRoutes.tsx` redirects every unmatched URL to `/`, giving users no explanation.

Recommended changes:

- Add a proper 404 page.
- Include “Return home,” “Browse properties,” and role-aware dashboard actions.

### 7. Default test execution is unstable

Normal `npm test` result:

- 62 test files passed.
- 214 tests passed.
- 6 worker-start timeouts.
- Overall exit code 1.

Single-worker result:

- 68 test files passed.
- 232 tests passed.
- Exit code 0.

Recommended changes:

- Configure a stable Vitest worker limit.
- Use a bounded worker count in the standard test script.
- Use the same configuration locally and in CI.

### 8. Virtual-tour cleanup has a stale-ref warning

`src/components/virtualTour/VirtualTourExperience.tsx` reads `wrapperRef.current` during effect cleanup. Capture the referenced element inside the effect and use that stable value during cleanup.

### 9. No application-level error boundary

Unexpected render exceptions can blank the entire application despite individual loading and error states.

Recommended changes:

- Add a root error boundary.
- Add narrower boundaries around maps and virtual-tour viewers.
- Provide recovery actions without exposing exception details.

### 10. Several screens are excessively large

Notable examples include public property details, the proxy inspection workspace, installments, and several admin screens.

Recommended changes:

- Extract stateful feature hooks.
- Split summary, actions, history, payments, and modal sections.
- Keep permission and presentation helpers independently testable.

## Lower-priority cleanup

- Rename `PaymentSucess` to `PaymentSuccess`.
- Standardize product casing to `RealtIQ`.
- Remove commented debug logging from the projects screen.
- Replace generic unavailable-feature screens with intentional empty states where appropriate.
- Add route tests for the 404 page and lazy-loading fallback.

## Validation results

- TypeScript and production build: passed.
- ESLint: passed with one virtual-tour warning.
- Tests with one worker: 68 files and 232 tests passed.
- Default parallel tests: failed because six workers timed out.
- Production build: passed with a large-chunk warning.

## Recommended implementation order

1. Remove sensitive console logging.
2. Correct trust badge and checklist states.
3. Add missing form labels.
4. Add route-level code splitting.
5. Stabilize Vitest workers.
6. Add error boundaries and a proper 404 page.
