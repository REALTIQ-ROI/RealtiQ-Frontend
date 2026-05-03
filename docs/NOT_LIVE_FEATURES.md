# RealtiQ Frontend: Not-Live Features Audit

Audit date: 2026-05-02

This file lists pages, features, and UI controls that exist in the frontend but are not fully live yet. "Not live" means the UI is a placeholder, uses static/mock data, has no backend mutation behind it, or exposes controls that do not actually perform the implied action.

## High Priority

### Payment checkout initialization

- **Current state:** `/checkout` is a notice page only.
- **Evidence:** `src/pages/public/Checkout.tsx` says the payment UI is prepared and should be connected to `/payments`.
- **Missing:** A real checkout page that calls `POST /payments/initialize`, receives `{ redirectUrl, reference }`, and redirects to Paystack.
- **Related gap:** `src/services/paymentService.ts` supports list, detail, and verify only. It has no `initializePayment()` method.
- **Impact:** Buyers can reach Paystack only through `propertyService.buyProperty()` (`POST /properties/:id/buy`), not the intended Paystack initialize flow.

### Featured listings management

- **Current state:** Admin featured listings screen is static/local-state only.
- **Evidence:** `src/pages/dashboard/Admin/FeaturedListings.tsx` uses a hard-coded `properties` array and local `activeStates`; `Publish Changes`, `Discard Changes`, `OPEN LIVE PREVIEW`, and `Global Settings` do not persist to backend.
- **Missing:** Fetch real properties, update featured state through existing backend/API, persist ordering/rotation if backend supports it, and remove static Google-hosted demo assets.
- **Related route:** `/featured-control` is also only a scaffold notice in `src/pages/public/FeaturedListingControl.tsx`.

### Contact form submission

- **Current state:** Public contact page only sets local `submitted` state.
- **Evidence:** `src/pages/public/Contact.tsx` `handleSubmit()` prevents default and sets `submitted` to `true`; no service/API call is made.
- **Missing:** Contact/support endpoint integration, validation beyond native required fields, loading/error state, and success/error toast.

### Newsletter signup

- **Current state:** Footer newsletter input and Join button are visual only.
- **Evidence:** `src/components/layout/Footer.tsx` has no form state, submit handler, or API call.
- **Missing:** Newsletter subscription endpoint or external provider integration, validation, loading/error/success feedback.

### Password reset / forgot password

- **Current state:** Forgot password controls are present but inert.
- **Evidence:** `src/pages/auth/LoginToPurchase.tsx` has a `Forgot?` button with no handler. Other login flows do not expose a working reset flow.
- **Missing:** Forgot password page, reset request endpoint, reset token page, validation, and success/error feedback.

## Medium Priority

### Buyer purchase continuation pages

- **Current state:** `/login-to-purchase` and `/register-to-purchase` authenticate then navigate to `/checkout`, but checkout is not live.
- **Evidence:** `src/pages/auth/LoginToPurchase.tsx` and `src/pages/auth/RegisterToPurchase.tsx` call `navigate('/checkout')`.
- **Missing:** Preserve selected property context, complete checkout initialization, and submit phone from `RegisterToPurchase` if it remains visible.

### Payment result notice pages

- **Current state:** `/payment-success` and `/payment-failed` are generic notice pages.
- **Evidence:** `src/pages/public/PaymentSucess.tsx` and `src/pages/public/PaymentFailed.tsx` use `PageNotice`.
- **Missing:** Prefer `/post-payment-redirect` for real Paystack verification. If these routes remain, they need payment reference context, receipt links, and retry behavior.

### Admin property detail actions

- **Current state:** Several admin property detail controls are UI-only.
- **Evidence:** `src/pages/dashboard/Admin/AdminPropertyDetails.tsx` includes `Contact Owner`, `Message Portal`, admin notes, performance/sparkline placeholders, and owner contact display based on owner id only.
- **Missing:** Owner profile fetch/display, contact/message workflows, persisted admin notes, real property analytics/views/inquiry counts.

### Admin property management actions

- **Current state:** Property list is API-backed through `PropertiesContext`, but some controls are not functional.
- **Evidence:** `src/pages/dashboard/Admin/ManageProperties.tsx` has a Sort by select that does not alter ordering, report/download cards without handlers, and delete has no confirmation modal.
- **Missing:** Sorting behavior, report generation/download integration, safer delete confirmation, loading/error states from `PropertiesContext`.

### Landlord property detail analytics/actions

- **Current state:** Detail page mixes real property fields with static analytics and inert controls.
- **Evidence:** `src/pages/dashboard/Landlord/LandlordPropertyDetails.tsx` shows hard-coded Total Views, Inquiries, Avg. Time to Close, inquiry log rows, Update Financials, Download PDF Report, Manage Gallery, status radio buttons, area analytics, and Full CRM controls.
- **Missing:** Property analytics API, inquiry log integration, financial update flow, report generation, gallery management, status update mutation.

### Landlord dashboard analytics

- **Current state:** Some counts are API-derived, but headline insights and activity are static.
- **Evidence:** `src/pages/dashboard/Landlord/LandlordDashboard.tsx` shows "94% occupancy", "The Obsidian House", and static recent activity messages.
- **Missing:** Real occupancy/performance metrics, recent activity feed, dynamic highlighted property selection.

### Buyer dashboard analytics and actions

- **Current state:** Some buyer counts are API-derived, but most portfolio analytics/actions are static.
- **Evidence:** `src/pages/dashboard/Buyer/BuyerDashboard.tsx` has inert `Schedule Viewing`, `Tax Reports`, `View All History`, `Review Matching Assets`, static market insights, hard-coded growth percentages, and static profile imagery.
- **Missing:** Viewing scheduler, reports, activity feed, market insight data, recommendation/matching API.

### Buyer property portfolio

- **Current state:** Buyer properties page is partly real but not scoped correctly and includes static controls.
- **Evidence:** `src/pages/dashboard/Buyer/MyProperties.tsx` filters `properties.filter((item) => item.buyerId)` instead of current user id, search does not filter, pagination buttons are static, and "Register New Property" points to browsing.
- **Missing:** Filter by `buyerId === user._id`, live search, real pagination, correct CTA wording/action.

### Landlord property portfolio filters

- **Current state:** Landlord property list shows real owner properties, but filters/search/view mode are mostly local or visual only.
- **Evidence:** `src/pages/dashboard/Landlord/LandlordMyProperties.tsx` has search input that does not filter; `activeFilter` buttons include drafts/pending states that are not applied to the property list; pagination controls are static.
- **Missing:** Search/filter implementation, status model support for draft/pending if intended, real pagination, loading/error states.

### Buyer and landlord dashboard property detail fallback behavior

- **Current state:** Some dashboard detail pages select the first matching property or a fallback rather than requiring an id.
- **Evidence:** `src/pages/dashboard/Buyer/PropertyDetails.tsx` selects the first purchased property. `src/pages/dashboard/Landlord/LandlordPropertyDetails.tsx` falls back to the first owned property if no route id is provided.
- **Missing:** Parameterized detail flows everywhere, "not found" states, and direct links from all portfolio cards.

## Public Pages / Static UX

### Public filters route

- **Current state:** `/filters` is a notice page.
- **Evidence:** `src/pages/public/FiltersAndSort.tsx`.
- **Missing:** Either remove the route or turn it into a real advanced search/filter page. Basic filters already exist on listings.

### Virtual tour

- **Current state:** Property details has a virtual tour CTA that only calls `alert('Virtual tour coming soon')`.
- **Evidence:** `src/pages/public/PropertyDetails.tsx`.
- **Missing:** Tour media/model support, route/modal viewer, fallback when a listing has no tour.

### Public map / neighborhood panel

- **Current state:** Property details map is a visual placeholder.
- **Evidence:** `src/pages/public/PropertyDetails.tsx` has a map placeholder block and static nearby places.
- **Missing:** Map provider integration, real coordinates, real nearby places or amenities data.

### Redirecting route

- **Current state:** `/redirecting` is a static notice.
- **Evidence:** `src/pages/public/Redirecting.tsx`.
- **Missing:** Actual redirect target logic or route removal.

### Static legal/support links

- **Current state:** Several support/legal links are dead anchors or plain text.
- **Evidence:** `src/components/layout/Footer.tsx`, `src/components/layout/AdminLayout.tsx`, `src/pages/auth/LoginToPurchase.tsx`, and `src/pages/auth/Admin/AdminLogin.tsx`.
- **Missing:** Privacy, terms, support/help routes or external URLs.

## Data / Service Layer Gaps

### Old mock layer still present

- **Current state:** `src/services/mockStore.ts` and `src/constants/mockData.ts` remain in the repo.
- **Evidence:** No active service imports `mockStore`, but README and docs still describe mock-backed behavior.
- **Missing:** Remove or archive mock layer after migration, or clearly mark it as development-only. Update README to reflect real API-backed services.

### Duplicate axios client

- **Current state:** `src/lib/axios.ts` is used by live services. `src/services/api.ts` also defines an axios client with a different default base URL.
- **Evidence:** `src/services/api.ts` is not imported by active services, while services import `../lib/axios`.
- **Missing:** Remove the unused client or standardize all services on one API client.

### Payment initialize API missing in service

- **Current state:** `paymentService` does not expose `initializePayment`.
- **Evidence:** `src/services/paymentService.ts`.
- **Missing:** Add `initializePayment(payload)` for `POST /payments/initialize` and use it from checkout/purchase flows.

## Search, Notifications, and Support Controls

### Global/admin search

- **Current state:** Admin topbar search is visual only.
- **Evidence:** `src/components/layout/AdminLayout.tsx`.
- **Missing:** Search behavior, route navigation, or removal.

### Dashboard search boxes

- **Current state:** Several dashboard search inputs do not affect displayed data.
- **Evidence:** Buyer dashboard, buyer properties, landlord dashboard, landlord properties, buyer inquiries header, and admin layout.
- **Missing:** Hook search inputs into local filtering or backend query params.

### Notifications/mail/help icons

- **Current state:** Notification, mail, help, support icons exist throughout dashboards but do not open panels or routes.
- **Evidence:** Admin, buyer, and landlord layouts/pages.
- **Missing:** Notification center, messages/inbox, help/support pages, or hide controls until available.

## Reporting / Analytics Gaps

### Reports and exports

- **Current state:** Multiple report/export buttons are visual only.
- **Evidence:** `Tax Reports`, `Download PDF Report`, `Download PDF`, `Export Report`, portfolio reports, and analytics buttons across dashboard pages.
- **Missing:** Report generation endpoints or client-side export logic.

### Charts are decorative

- **Current state:** Dashboard bar/sparkline charts are hard-coded CSS bars.
- **Evidence:** `src/pages/dashboard/Admin/AdminDashboard.tsx`, `src/pages/dashboard/Admin/AdminPropertyDetails.tsx`, `src/pages/dashboard/Buyer/BuyerDashboard.tsx`.
- **Missing:** Real analytics datasets or chart components. No chart library is currently present.

## Documentation Drift

### README still describes mock behavior

- **Current state:** README says the app uses local mock store and payment initialization is mocked.
- **Evidence:** `README.md`.
- **Missing:** Update README after API migration to document live backend requirements, env variables, supported flows, and remaining placeholders.

### Backend integration docs still include migration instructions

- **Current state:** `docs/backend.md` still includes "replace mock service calls" guidance even though several services are now API-backed.
- **Evidence:** `docs/backend.md`.
- **Missing:** Mark completed sections, remove stale instructions, and document current frontend endpoint coverage.

## Recommended Next Implementation Order

1. Implement `paymentService.initializePayment()` and replace `/checkout` with a real Paystack initialization flow.
2. Replace static `FeaturedListings` with real property data and persist featured changes.
3. Wire Contact and Newsletter submissions.
4. Add real search/filter behavior to dashboard list pages.
5. Replace dashboard decorative analytics with backend-driven stats/activity.
6. Remove or quarantine unused mock infrastructure and update README.
