# RealtiQ Frontend — Project Analysis

## Overview

| Property | Value |
|---|---|
| **Name** | RealtiQ Frontend |
| **Type** | Real Estate Platform (Single Page Application) |
| **Framework** | React 19 |
| **Language** | TypeScript ~5.9.3 |
| **Build Tool** | Vite 8.0.1 |
| **Version** | 0.0.0 |
| **Deployment** | Vercel |

RealtiQ is a multi-role real estate platform where **Buyers** browse and purchase properties, **Landlords** list and manage their properties, and **Admins** oversee the entire platform.

---

## Dependencies

### Production

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | Core UI library |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `react-router-dom` | ^7.14.0 | Client-side routing |
| `axios` | ^1.14.0 | HTTP client for API requests |
| `tailwindcss` | ^4.2.2 | Utility-first CSS framework |
| `postcss` | ^8.5.8 | CSS post-processing (required by Tailwind) |
| `autoprefixer` | ^10.4.27 | Vendor prefix automation |
| `@types/react-router-dom` | ^5.3.3 | TypeScript types for router |

### Development

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.1 | Build tool and dev server |
| `@vitejs/plugin-react` | ^6.0.1 | Vite Fast Refresh for React |
| `typescript` | ~5.9.3 | Static type checking |
| `eslint` | ^9.39.4 | Code linting |
| `typescript-eslint` | ^8.57.0 | ESLint TypeScript support |
| `eslint-plugin-react-hooks` | ^7.0.1 | React Hooks linting rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | Fast refresh validation |
| `@types/react` | ^19.2.14 | React TypeScript definitions |
| `@types/react-dom` | ^19.2.3 | React DOM TypeScript definitions |
| `@types/node` | ^24.12.0 | Node.js TypeScript definitions |
| `globals` | ^17.4.0 | ESLint globals config |

---

## Project Structure

```
realtiq-frontend/
├── public/
├── src/
│   ├── assets/                     # Static assets (images, icons)
│   ├── components/
│   │   ├── dashboard/              # Dashboard-specific components
│   │   │   └── DashboardSection    # Section container for dashboards
│   │   ├── forms/                  # Form components
│   │   │   ├── LoginForm           # Email/password login form
│   │   │   ├── RegisterForm        # User registration form
│   │   │   ├── PropertyForm        # Create/edit property form
│   │   │   └── InquiryForm         # Property inquiry form
│   │   ├── layout/                 # Layout wrappers
│   │   │   ├── PublicLayout        # Navbar + Footer wrapper
│   │   │   ├── AuthLayout          # Centered form wrapper
│   │   │   ├── DashboardLayout     # Sidebar + content wrapper
│   │   │   ├── AdminLayout         # Admin-specific layout
│   │   │   ├── LandlordPortalLayout # Landlord-specific layout
│   │   │   ├── Navbar              # Top navigation bar
│   │   │   ├── DashboardSidebar    # Role-based sidebar navigation
│   │   │   └── Footer              # Footer component
│   │   ├── property/               # Property-related components
│   │   │   ├── PropertyCard        # Property grid card
│   │   │   ├── PropertyGallery     # Image gallery carousel
│   │   │   ├── PropertyFiltersPanel # Filter and search interface
│   │   │   └── PropertyMeta        # Property metadata display
│   │   └── ui/                     # Base UI primitives
│   │       ├── Button              # Button with variants
│   │       ├── Input               # Input field with label/error
│   │       ├── Card                # Generic card container
│   │       ├── ErrorState          # Error state display
│   │       ├── LoadingState        # Loading skeleton/spinner
│   │       └── PageNotice          # Notice/alert component
│   ├── constants/
│   │   └── mockData.ts             # Seed/mock data constants
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Authentication global state
│   │   └── PropertiesContext.tsx   # Properties global state + CRUD
│   ├── hooks/
│   │   └── useAsync.ts             # Generic async data-fetching hook
│   ├── pages/
│   │   ├── auth/                   # Authentication pages
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── LoginToPurchase.tsx
│   │   │   ├── RegisterToPurchase.tsx
│   │   │   ├── Admin/AdminLogin.tsx
│   │   │   ├── Landlord/LandlordLogin.tsx
│   │   │   └── Landlord/LandlordRegister.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx       # Role-based dashboard router
│   │   │   ├── Admin/              # Admin dashboard pages
│   │   │   ├── Buyer/              # Buyer dashboard pages
│   │   │   └── Landlord/           # Landlord dashboard pages
│   │   └── public/                 # Public-facing pages
│   ├── routes/
│   │   ├── AppRoutes.tsx           # Central route definitions
│   │   └── ProtectedRoute.tsx      # Role-based route guard
│   ├── services/
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── authService.ts          # Login/register operations
│   │   ├── propertyService.ts      # Property CRUD operations
│   │   ├── inquiryService.ts       # Inquiry operations
│   │   ├── paymentService.ts       # Payment operations
│   │   ├── userService.ts          # User management operations
│   │   └── mockStore.ts            # In-memory mock database (localStorage-backed)
│   ├── types/
│   │   └── index.ts                # All shared TypeScript types
│   ├── App.tsx                     # Root component with context providers
│   ├── main.tsx                    # Vite entry point
│   ├── index.css                   # Global base styles
│   └── App.css                     # App-specific animations and hero styles
├── index.html                      # HTML entry (Tailwind config inline)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── vercel.json
├── eslint.config.js
└── package.json
```

---

## Pages & Routes

### Public Routes

| Path | Page | Description |
|---|---|---|
| `/` | Home | Landing page with hero, featured listings, and CTAs |
| `/properties` | Listings | Browsable property listings with search and filters |
| `/properties/:id` | PropertyDetails | Detailed view of a single property |
| `/about` | About | About RealtiQ page |
| `/contact` | Contact | Contact page |
| `/about-contact` | AboutContact | Combined about and contact page |
| `/inquiry` | Inquiry | Property inquiry submission form |
| `/inquiry-success` | InquirySuccess | Inquiry submission confirmation |
| `/checkout` | Checkout | Checkout/payment page |
| `/payment-success` | PaymentSuccess | Successful payment confirmation |
| `/payment-failed` | PaymentFailed | Failed payment result |
| `/post-payment-redirect` | PostPaymentRedirect | Post-payment redirect handler |
| `/redirecting` | Redirecting | Loading/redirect state page |
| `/login-required` | LoginRequired | Prompt to log in before proceeding |
| `/filters` | Filters | Filters and sort options page |
| `/featured-control` | FeaturedControl | Featured listing control page |

### Authentication Routes

| Path | Page | Description |
|---|---|---|
| `/login` | Login | Buyer login |
| `/register` | Register | Buyer registration |
| `/login-to-purchase` | LoginToPurchase | Login gate before purchase |
| `/register-to-purchase` | RegisterToPurchase | Register gate before purchase |
| `/auth/admin/login` | AdminLogin | Admin-only login |
| `/auth/landlord/login` | LandlordLogin | Landlord login |
| `/auth/landlord/register` | LandlordRegister | Landlord registration |

### Buyer Dashboard Routes _(protected — role: buyer)_

| Path | Description |
|---|---|
| `/dashboard/buyer` | Buyer overview |
| `/dashboard/buyer/my-properties` | Purchased properties list |
| `/dashboard/buyer/property-details` | Property detail view |
| `/dashboard/buyer/payment-history` | Payment history |
| `/dashboard/buyer/payment-details` | Individual payment details |
| `/dashboard/buyer/inquiry-history` | Sent inquiries list |
| `/dashboard/buyer/inquiry-details` | Individual inquiry details |
| `/dashboard/buyer/profile-settings` | Profile and account settings |

### Landlord Dashboard Routes _(protected — role: landlord)_

| Path | Description |
|---|---|
| `/dashboard/landlord` | Landlord overview |
| `/dashboard/landlord/my-properties` | Listed properties |
| `/dashboard/landlord/property-details` | Property detail view |
| `/dashboard/landlord/property-details/:id` | Property detail by ID |
| `/dashboard/landlord/payment-history` | Payment history |
| `/dashboard/landlord/inquiries` | Received inquiries |
| `/dashboard/landlord/inquiry-details` | Individual inquiry details |
| `/dashboard/landlord/add-property` | Add a new property listing |
| `/dashboard/landlord/edit-property` | Edit a property listing |
| `/dashboard/landlord/edit-property/:id` | Edit property by ID |

### Admin Dashboard Routes _(protected — role: admin)_

| Path | Description |
|---|---|
| `/dashboard/admin` | Admin overview |
| `/dashboard/admin/manage-users` | User management |
| `/dashboard/admin/manage-properties` | Property management |
| `/dashboard/admin/property-details` | Property detail view |
| `/dashboard/admin/manage-payments` | Payment management |
| `/dashboard/admin/manage-inquiries` | Inquiry management |
| `/dashboard/admin/manage-landlords` | Landlord management |
| `/dashboard/admin/landlord-details` | Landlord detail view |
| `/dashboard/admin/featured` | Featured listings management |

---

## Features

### 1. Multi-Role User System
- Three distinct roles: **Buyer**, **Landlord**, **Admin**
- Each role has its own dashboard, navigation, and access scope
- Role-based route protection via `ProtectedRoute` component
- Role-based sidebar navigation items

### 2. Property Listings
- Browse all available properties publicly
- Each listing shows image, title, location, price, beds/baths/sqft
- Detailed property view with full gallery, amenities, and metadata
- Property card grid layout with responsive columns

### 3. Search & Filtering
- Filter properties by price range, type, bedrooms, and location
- Dedicated filters panel component
- Filters/sort page for mobile access

### 4. Inquiry System
- Buyers can submit inquiries on individual properties
- Landlords view and manage received inquiries
- Admin can view and manage all inquiries platform-wide
- Inquiry status tracking

### 5. Payment System
- Checkout flow with payment initialization
- Payment status tracking (pending / paid / failed)
- Buyer payment history with individual payment details
- Landlord payment history
- Admin payment management view

### 6. Property Management (Landlord)
- Add new property listings via multi-field form
- Edit existing property listings
- View all personally listed properties
- Manage inquiries received on listings

### 7. Admin Controls
- Manage all users across the platform
- Manage all property listings
- Manage all payments and inquiries
- Manage landlord accounts with detail view
- Control which properties appear as featured listings

### 8. Authentication
- Email and password authentication
- Separate login flows for buyers, landlords, and admins
- Session persistence via localStorage
- Protected routes redirect unauthenticated users to login
- Preserves intended destination on redirect

### 9. Mock Development Backend
- Fully functional in-memory mock database (localStorage-backed)
- Pre-seeded demo accounts for all three roles
- Full CRUD operations mocked without needing a live backend
- Demo credentials:
  - **Buyer:** `buyer@realtiq.com` / `Buyer@123`
  - **Landlord:** `landlord@realtiq.com` / `Landlord@123`
  - **Admin:** `admin@realtiq.com` / `Admin@12345`

### 10. Responsive Design
- Mobile-first layouts throughout
- Responsive grid and flex patterns via Tailwind
- Hidden/visible elements at breakpoints (sm, md, lg)
- Sticky sidebar on desktop, collapsed on mobile

---

## State Management

| Layer | Tool | Responsibility |
|---|---|---|
| Global Auth State | `AuthContext` (React Context) | User session, login, register, logout |
| Global Properties State | `PropertiesContext` (React Context) | Properties list, CRUD, buy property |
| Local Component State | `useState` | Form inputs, UI toggles, validation errors |
| Async Data Handling | `useAsync` custom hook | Loading, error, and data states for async ops |
| Persistence | `localStorage` | Auth token, user object, mock database |

---

## API & Services

### Axios Instance (`src/services/api.ts`)
- Base URL: `VITE_API_BASE_URL` env var, defaults to `http://localhost:5000/api`
- Request interceptor auto-attaches Bearer token from localStorage
- 60-second timeout

### Service Modules

| Service | Operations |
|---|---|
| `authService` | `login`, `register` |
| `propertyService` | `getAll`, `getById`, `create`, `update`, `delete`, `buyProperty` |
| `inquiryService` | `create`, `getAll`, `getByProperty`, `getByUser`, `updateStatus` |
| `paymentService` | `initialize`, `getAll`, `getByUser` |
| `userService` | `getAll`, `getLandlords`, `updateName` |

---

## Styling & Design System

| Property | Value |
|---|---|
| **CSS Framework** | Tailwind CSS v4.2.2 |
| **Config location** | Inline `<script>` in `index.html` |
| **Design language** | Material Design 3 color system |
| **Headline font** | Manrope (Google Fonts) |
| **Body/label font** | Inter (Google Fonts) |
| **Icons** | Material Symbols (Google Fonts) |

### Color Palette

| Token | Hex | Use |
|---|---|---|
| `primary` | `#000000` | Primary actions, buttons |
| `secondary` | `#505f76` | Secondary elements |
| `surface` | `#f7f9fb` | Page background |
| `error` | `#ba1a1a` | Error states |
| `on-primary` | white | Text on primary |
| `on-surface` | dark | Body text |
| `outline` | — | Borders |
| `surface-container-*` | — | Card backgrounds |

---

## Authentication Flow

```
User submits credentials
        ↓
LoginForm / RegisterForm
        ↓
AuthContext.login / AuthContext.register
        ↓
authService → mockStore validates credentials
        ↓
Returns { user, token }
        ↓
AuthContext saves to localStorage + updates state
        ↓
ProtectedRoute checks role → redirects to correct dashboard
```

**Token format:** `mock-jwt-{userId}-{timestamp}`

---

## Build & Deployment

### Scripts

| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the project |

### TypeScript Config (`tsconfig.app.json`)

| Setting | Value |
|---|---|
| Target | ES2023 |
| Module | ESNext |
| JSX | react-jsx |
| Strict mode | Enabled |
| No unused vars/params | Enforced |

### Vercel Config (`vercel.json`)

All routes rewrite to `/index.html` to support client-side routing in SPA mode.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Backend API base URL |

---

## Architectural Decisions

1. **React Context over Redux** — Simpler global state without the boilerplate overhead
2. **Service layer abstraction** — API/mock logic is isolated from components
3. **Mock Store pattern** — Enables full frontend development without a running backend
4. **`useAsync` custom hook** — Standardizes loading/error/data pattern across async calls
5. **Layout composition** — Page structures are composed via layout wrapper components
6. **Centralized types** — All TypeScript interfaces live in a single `src/types/index.ts`
7. **Role-based `ProtectedRoute`** — Access control is enforced at the routing layer
8. **TypeScript strict mode** — Strict compiler settings enforce type safety throughout
9. **Nigerian Naira (NGN) currency** — `Intl.NumberFormat` used for price formatting
10. **Tailwind config inline in HTML** — Faster initial setup; trades config portability for simplicity
