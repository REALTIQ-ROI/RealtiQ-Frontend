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
