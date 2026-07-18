# RealtiQ Frontend

RealtiQ is a React + TypeScript frontend for a real estate platform with public property discovery, authentication, and role-based dashboards for buyers, landlords, and admins.

## Property Maps

Property discovery uses Leaflet with OpenStreetMap tiles and clustered price markers. No map API key is required.
Only properties whose existing API response contains valid `coordinates.lat` and `coordinates.lng` values appear
on the map; all properties continue to appear in list results. Address geocoding is intentionally not performed in
the browser, so no coordinates are inferred or invented.

## Features

- Public pages: home, listings, property details, about/contact, inquiry flow, checkout, and payment result routes
- Role-based authentication and protected routing
- Buyer dashboard: purchased properties, payments, inquiries, and profile settings
- Landlord dashboard: property CRUD, inquiries, and payment history
- Admin dashboard: manage users, landlords, properties, payments, and inquiries
- Local mock data layer (no backend required for core flows)

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS (via CDN config in `index.html`)
- ESLint

## Getting Started

### Prerequisites

- Node.js 18+ (recommended current LTS)
- npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will run on Vite's default local URL (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Environment Variables

Create a `.env` file in the project root if needed:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Notes:

- `VITE_API_BASE_URL` is configured in `src/services/api.ts`.
- Current feature services use a local mock store (`src/services/mockStore.ts`) for auth, properties, inquiries, users, and payments.

## Demo Accounts (Mock Data)

The project seeds localStorage with mock users on first run:

- Buyer: `buyer@realtiq.com` / `Buyer@123`
- Landlord: `landlord@realtiq.com` / `Landlord@123`
- Admin: `admin@realtiq.com` / `Admin@12345`

Admin should use the admin login route: `/auth/admin/login`.

## Routing Overview

- Public: `/`, `/properties`, `/properties/:id`, `/about-contact`, `/checkout`, `/inquiry`, `/payment-success`, etc.
- Auth: `/login`, `/register`, `/login-to-purchase`, `/register-to-purchase`, `/auth/admin/login`, `/auth/landlord/login`, `/auth/landlord/register`
- Protected: `/dashboard`, `/dashboard/buyer/*` (buyer-only), `/dashboard/landlord/*` (landlord-only), `/dashboard/admin/*` (admin-only)

Protected access is handled in `src/routes/ProtectedRoute.tsx`.

## Project Structure

```text
src/
  components/     # UI, forms, layout, dashboard and property components
  contexts/       # Auth and Properties global state
  pages/          # Public, auth, and dashboard route pages
  routes/         # AppRoutes and ProtectedRoute
  services/       # Mock-backed service layer and API client
  types/          # Shared TypeScript models
```

## Data and State Notes

- Authentication session is stored in localStorage (`token`, `user`)
- Mock database is stored in localStorage key: `realtiq-mock-db-v1`
- Property state is centralized in `PropertiesContext`

## Current Limitations

- Payment initialization is mocked and currently redirects to `/payment-success`
- Core data operations are localStorage-backed and not persisted to a real backend


Current cryptographic title hash flow:

  1. Landlord uploads restricted title document
      - UI: LandlordTitleVerifications.tsx
      - API: POST /api/document/title-upload
      - Sends propertyId = RTQ-PROP-..., document type, title, and file.
      - Backend stores it as restricted Document Vault record.
      - Backend returns document.publicReference, e.g. RTQ-DOC-00000001.

  2. Landlord submits document for title verification
      - UI sends:

        {
          propertyId: "RTQ-PROP-...",
          documentId: "RTQ-DOC-...",
          documentType,
          metadata: { source: "landlord_dashboard" }
        }

      - API: POST /api/title-verifications

  3. Backend hashes the stored document bytes
      - Backend fetches the stored file over HTTPS from document.fileUrl.
      - Validates file type: PDF, JPEG, PNG, WebP.
      - Validates max size: 50 MB.
      - Computes:

        crypto.createHash("sha256").update(buffer).digest("hex")

      - Public label is SHA-256.
      - This becomes submissionHash.

  4. Duplicate fingerprint check
      - Backend checks whether the same hash already exists as:
          - another submissionHash
          - or another verifiedDocumentHash

      - If duplicate risk exists, verification is created as under_review, document is frozen, and API returns 409.
      - Frontend shows: “A matching title-document fingerprint already exists and requires legal review.”

  5. Document is frozen
      - Backend writes hash metadata onto the Document:
          - contentHash
          - hashAlgorithm
          - titleVerificationFrozen = true
          - titleVerificationId
          - fileSizeBytes

      - This prevents the same document from being reused for another active verification.

  6. Admin legal review
      - Admin reviews in title verification admin screen.
      - On approval, backend re-fetches and re-hashes the stored document bytes.
      - If the new hash differs from submissionHash, approval fails with 409 because the file changed after submission.
      - If it matches, backend sets:
          - verifiedDocumentHash
          - hashAlgorithm = SHA-256
          - status approved

  7. Public registry publication
      - Backend publishes a registry record using the verified hash.
      - It creates a canonical payload containing:
          - sequence number
          - property id
          - documentHash
          - hash algorithm
          - verification version
          - approval timestamp
          - previous record hash

          - Document hash: SHA-256 of the title file bytes.
          - Record hash: SHA-256 of the registry metadata payload.

      - Integrity endpoint verifies:
          - current recordHash
          - previous-record link
          - signature if configured

  9. Public verification page
      - URL: /title-verification/:publicVerificationId
      - Shows:
          - public verification ID, e.g. RTQ-TV-2026-000001
          - property public reference
          - SHA-256 document hash
          - record hash
          - previous record hash
          - signature/external anchor status

      - Public users can upload a document copy.
      - API hashes the uploaded file and compares it to the registered documentHash.

  So the important bit: the frontend never computes the authoritative title hash. The backend hashes the exact stored bytes, freezes that fingerprint,
  re-confirms it at legal approval, then publishes the verified hash into a chained public registry record.