# Portl Admin — Web Dashboard

A separate web app for Society Admins/committee members, per the PRD's "web admin dashboard"
requirement. React + TypeScript + Vite + Tailwind v4, talking to the same `portl-backend` API as
the mobile app.

## Setup

```bash
npm install
cp .env.example .env    # set VITE_API_URL if your backend isn't on localhost:4000
npm run dev              # http://localhost:5173
```

Requires the backend running (`../portl-backend`) — this app has no offline/mock fallback (unlike
the mobile app); it's a committee tool, always expected to be online.

### Login

Password-based only (`POST /auth/login`), and only accounts with `role: "admin"` are let in.
Demo: **9876511111** / **demo1234** (seeded by the backend's `npm run seed`).

## Pages

- **Overview** — KPI cards (open tickets, visitors today, dues collected, resident count), recent tickets
- **Tickets** — full complaint queue, filter by status, one-click status progression
- **Visitors** — searchable entry/exit log across the whole society
- **Notices** — publish broadcasts (pushes to every resident via the backend)
- **Polls** — create polls, watch live vote tallies
- **Residents** — full user directory (all roles)
- **Amenities** — add/remove bookable amenities and their hours
- **Staff & Vendors** — manage the service-provider directory
- **Billing** — create maintenance bills per flat, see paid/unpaid status

## Structure

```
src/
  lib/api.ts        fetch client (JWT via localStorage)
  lib/types.ts        shared types matching the backend
  store/authStore.ts  Zustand session store
  components/          AppLayout (sidebar nav), ui.tsx (Card/Badge/Button/PageHeader)
  pages/                one file per route, each fetches directly via @tanstack/react-query
```

## What's not built here

- No dark mode
- No audit log viewer (data exists via the API, just no UI yet)

## Tables: pagination, search, CSV export, bulk actions

- **Residents** — search (name/phone/flat), role filter, pagination, CSV export.
- **Visitors** — search (name/flat/company), pagination, CSV export.
- **Billing** — status filter (all/unpaid/paid), pagination, CSV export, and a bulk **"Mark
  selected as paid"** action for reconciling offline/cash payments. Backed by a new admin-only
  endpoint, `POST /bills/mark-paid` (`{ ids: string[] }`), separate from the resident-facing
  Razorpay/mock-pay flow — see `portl-backend`'s README.

Pagination is client-side (`src/hooks/usePagination.ts` + `src/components/Pagination.tsx`),
reusable across any table — fine at current scale since `GET /users` / `/visitors` / `/bills`
return full result sets; swap in server-side paging (`?page=&pageSize=`) once those tables get
large enough that shipping the whole list becomes a real cost. CSV export
(`src/lib/csv.ts`) exports whatever rows are currently filtered/searched, not just the current
page.

## CI/CD

`.github/workflows/admin-web-ci.yml` runs on every push/PR to `main`: install → lint (`oxlint`) →
typecheck + build (`tsc -b && vite build`). Assumes this repo is deployed independently (e.g. to
Vercel/Netlify) — if all three Portl projects end up in one monorepo instead, see the comment at
the top of `portl-backend/.github/workflows/backend-ci.yml` for the adjustment.
