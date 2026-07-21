# Portl Backend

Express + TypeScript API for the Portl society management app. JWT auth with role claims,
Socket.IO for live visitor/notice/ticket events, Expo push notifications, local file uploads,
and Razorpay payments — backed by SQLite via Drizzle ORM.

**Why SQLite by default, with real Postgres support too?** Zero-setup by default —
`npm install && npm run seed && npm run dev` just works, no database server to provision. Set
`DB_DRIVER=postgres` (see "Switching to Postgres" below) to run against real Postgres instead —
same schema, same query modules, no code changes needed.

## Switching to Postgres

The schema is defined twice — `src/db/schema.sqlite.ts` and `src/db/schema.pg.ts` — with identical
table/column names, and `src/db/schema.ts` re-exports whichever one matches `DB_DRIVER`. Every
query module (`src/modules/**/routes.ts`) imports from `src/db/schema.ts`, so switching drivers
never touches application code.

```bash
# .env
DB_DRIVER=postgres
DATABASE_URL=postgres://user:password@localhost:5432/portl
```

Then `npm run seed && npm run dev` as usual — the Postgres bootstrap SQL
(`src/db/migrate.pg.ts`) creates the same tables (with proper Postgres enums instead of SQLite's
CHECK constraints). This was tested end-to-end against a real local Postgres 16 instance — full
auth → visitor → approve → entry → poll → bill flow, all passing.

## Setup

```bash
npm install
cp .env.example .env      # fill in JWT_SECRET at minimum; Razorpay keys optional
npm run seed               # creates portl.db with demo users + sample data
npm run dev                 # starts on http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

### Demo accounts (created by `npm run seed`)

| Role | Phone | Password | OTP (via /auth/verify-otp) |
|---|---|---|---|
| Resident — Priya Menon, A-1005 | 9876543210 | demo1234 | 1234 |
| Security Guard — Rohit Yadav | 9876500000 | demo1234 | 1234 |
| Society Admin — Mrs. Sharma | 9876511111 | demo1234 | 1234 |

## Connecting the mobile app

In the Expo app's `.env` (see `portl/.env.example`), set:

```
EXPO_PUBLIC_API_URL=http://<your-machine-LAN-IP>:4000
```

Use your machine's LAN IP (not `localhost`) if testing on a physical device — `localhost` on the
phone refers to the phone itself. Simulators/emulators can usually use `localhost` directly
(Android emulator: `http://10.0.2.2:4000`).

## Architecture

```
src/
  db/
    schema.ts       Drizzle table definitions — the source of truth for every entity
    migrate.ts       Raw CREATE TABLE IF NOT EXISTS bootstrap (no migration files to manage)
    index.ts         better-sqlite3 + Drizzle client
  middleware/
    auth.ts           isAuthenticated (JWT) + checkRole(...roles) — RBAC on every route
  modules/
    auth/             signup, password login, mocked-OTP login, refresh, /me
    users/             profile CRUD, push token registration, admin resident list
    visitors/           register, approve/reject, entry/exit, history, guest passes/QR
    complaints/         create, list, admin status updates
    amenities/          list/create/delete
    bookings/           create (with slot-conflict check), list, cancel
    notices/            list, admin create (broadcasts via socket + push)
    polls/               list with live tallies, create, vote (one per user), results
    staff/                service provider directory
    bills/                list, admin create, Razorpay order/verify, mock-pay fallback
    uploads/               local/S3/Cloudinary file storage (STORAGE_DRIVER env var)
    notifications.ts    Expo push sender (fails soft if offline/unconfigured)
  socket.ts             Socket.IO server — JWT-authenticated, room-based event routing
  seed.ts                 demo data matching the mobile app's mocked accounts
  index.ts                app entry — mounts everything, starts HTTP + Socket.IO
```

## Auth

Two ways in, both issue the same JWT shape (`{ sub, role, phone }`, 1h access / 30d refresh):

- **`POST /auth/signup`** `{ name, phone, password, role, flatLabel?, towerName? }` — real
  password-based signup, `role` must be one of `resident|guard|admin`.
- **`POST /auth/login`** `{ phone, password }` — password login for accounts created via signup/seed.
- **`POST /auth/request-otp`** `{ phone }` — sends a real SMS code via Twilio Verify if configured
  (see below); otherwise returns `{ sent: false, demoMode: true }` so the client knows to show the
  fixed demo code instead.
- **`POST /auth/verify-otp`** `{ phone, otp, role? }` — matches the mobile app's phone → OTP screen.
  Checks the code against Twilio Verify if configured, otherwise accepts the fixed demo code
  `1234`. Auto-provisions a new resident if the phone isn't registered yet.
- **`POST /auth/refresh`** `{ refreshToken }` → new access token.
- **`GET /auth/me`** (auth'd) → current user.

Every protected route uses `Authorization: Bearer <accessToken>`. Role checks happen server-side
via `checkRole(...)` — the client role never has to be trusted.

### Rate limiting

`src/middleware/rateLimit.ts` applies IP-based limits via `express-rate-limit`:

- **`otpLimiter`** (5 requests / 15 min) on `POST /auth/request-otp` and `POST /auth/verify-otp`
  — the tightest limit in the app, since each Twilio SMS costs money and OTP endpoints are the
  classic SMS-bombing/brute-force target.
- **`authLimiter`** (20 requests / 15 min) on `POST /auth/login` and `POST /auth/signup` — looser,
  mainly to slow down credential stuffing.

Both return `429` with a JSON `{ error }` body once exceeded. Adjust the `windowMs`/`max` values
in `rateLimit.ts` if running behind a shared corporate NAT/proxy where many legitimate users share
one IP.

### Real SMS OTP (Twilio Verify)

Set these three in `.env` to switch from the demo code to real SMS:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxx   # create a Verify Service in the Twilio console first
```

`src/utils/twilio.ts` wraps the Verify API and is written to fail soft — if Twilio is unreachable
or misconfigured, `/auth/verify-otp` transparently falls back to the demo code rather than
breaking login. Numbers are sent as E.164 assuming `+91` (India); change `toE164()` if deploying
elsewhere.

## Real-time events (Socket.IO)

Connect with `io(url, { auth: { token: accessToken } })`. Server emits, matching the PRD's event
catalogue: `visitor-request`, `visitor-approved`, `visitor-rejected`, `visitor-entered`,
`visitor-exited`, `new-notice`, `new-poll`, `ticket-updated`. Residents should `socket.emit(
"join-flat", flatLabel)` after connecting to receive their flat's visitor events; guards/admins
are auto-joined to `guards`/`admins` rooms.

## Push notifications

`POST /users/me/push-token` registers a device's Expo push token (call this after
`Notifications.getExpoPushTokenAsync()` on the client). The server calls Expo's push API
(`https://exp.host/--/api/v2/push/send`) whenever a visitor request or notice is created. This
requires outbound internet from wherever you run the backend — it fails soft (logs a warning) if
unreachable, so it won't crash your dev server.

## Payments (Razorpay)

- `POST /bills/:id/pay/order` — creates a Razorpay order (needs `RAZORPAY_KEY_ID`/`SECRET` in `.env`).
- `POST /bills/:id/pay/verify` — verifies the HMAC signature Razorpay's checkout SDK returns, then
  marks the bill paid.
- `POST /bills/:id/pay/mock` — marks a bill paid without touching Razorpay at all. Use this for
  demos/grading when you don't want to wire up real test keys.

## File storage

`POST /uploads-api` (multipart, field name `file`) stores images/PDFs and returns
`{ url: "...", driver: "local" | "s3" | "cloudinary" }`. Every other module just stores whatever
`url` this endpoint returns, so switching drivers needs zero changes anywhere else.

Pick the driver with `STORAGE_DRIVER` in `.env`:

- **`local`** (default) — writes to disk under `./uploads`, served statically at `/uploads/*`.
  Zero setup, good for local dev and demos.
- **`s3`** — requires `S3_BUCKET` and `S3_REGION`. Uses the default AWS credential chain unless
  `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are set explicitly. If the bucket sits behind a CDN or
  custom domain, set `S3_PUBLIC_BASE_URL` so returned URLs point there instead of the raw S3 URL.
- **`cloudinary`** — requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  (from https://console.cloudinary.com/). Streams uploads directly to Cloudinary via
  `uploader.upload_stream` — no local disk write at any point.

All three go through the same `multer` middleware and the same `fileFilter`/8MB size limit; see
`src/modules/uploads/storage.ts` for the driver implementations and
`src/modules/uploads/routes.ts` for the route itself.

## Full route reference

| Method & path | Role | Purpose |
|---|---|---|
| POST /auth/signup | — | Create account |
| POST /auth/login | — | Password login |
| POST /auth/request-otp | — | Send real SMS OTP (Twilio) or signal demo mode |
| POST /auth/verify-otp | — | Verify OTP (Twilio if configured, else demo code 1234) |
| POST /auth/refresh | — | Refresh access token |
| GET /auth/me | any | Current user |
| GET /users/:id | any | Get a profile |
| PUT /users/:id | self/admin | Update a profile |
| GET /users | admin | List all users |
| POST /users/me/push-token | any | Register device push token |
| POST /visitors | guard | Register a visitor |
| POST /visitors/:id/approve | resident | Approve |
| POST /visitors/:id/reject | resident | Deny |
| POST /visitors/:id/entry | guard | Mark entry |
| POST /visitors/:id/exit | guard | Mark exit |
| GET /visitors | any | List/history (resident sees only their flat) |
| GET /visitors/:id | any | Get one |
| POST /visitors/guest-pass | resident | Generate QR gate pass |
| GET /visitors/guest-pass/:code | guard | Scan/redeem pass |
| POST /complaints | resident | Raise a ticket |
| GET /complaints | any | List (resident sees only their own) |
| PUT /complaints/:id | admin | Update status/assignment |
| GET /amenities | any | List amenities |
| POST /amenities | admin | Create amenity |
| DELETE /amenities/:id | admin | Remove amenity |
| GET /bookings | any | List bookings |
| POST /bookings | resident | Book a slot (conflict-checked) |
| DELETE /bookings/:id | owner/admin | Cancel |
| GET /notices | any | List notices |
| POST /notices | admin | Publish (broadcasts) |
| GET /polls | any | List with tallies + my vote |
| POST /polls | admin | Create |
| POST /polls/:id/vote | resident | Vote (once) |
| GET /polls/:id/results | any | Tallies only |
| GET /staff | any | Directory |
| POST /staff | admin | Add staff/vendor |
| DELETE /staff/:id | admin | Remove |
| GET /bills | any | List bills (resident sees only their flat) |
| POST /bills | admin | Create a bill |
| POST /bills/:id/pay/order | resident | Create Razorpay order |
| POST /bills/:id/pay/verify | resident | Verify signature, mark paid |
| POST /bills/:id/pay/mock | resident | Mark paid without Razorpay |
| POST /bills/mark-paid | admin | Reconcile offline/cash payment(s), single or bulk (`{ ids: string[] }`) |
| POST /uploads-api | any | Upload a file, get back a URL |
| GET /towers | any | List towers |
| POST /towers | admin | Create a tower |
| PUT /towers/:id | admin | Rename a tower |
| DELETE /towers/:id | admin | Delete a tower (409 if it still has flats) |
| GET /flats | any | List flats, optional `?towerId=` filter |
| POST /flats | admin | Create a flat under a tower |
| PUT /flats/:id | admin | Update a flat's number/label/owner |
| DELETE /flats/:id | admin | Delete a flat |

## Scripts

- `npm run dev` — tsx watch mode
- `npm run build` / `npm start` — compile to `dist/` and run
- `npm run seed` — (re)populate demo data
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Jest unit + integration tests (see below)

## Testing

`npm test` runs Jest against everything under `src/**/__tests__/`:

- **Unit tests** (`src/utils/__tests__/`) — JWT sign/verify, password hashing, the Twilio OTP
  wrapper's not-configured/configured/error paths (Twilio itself is mocked), the Razorpay client
  getter, and the storage driver selection logic (`src/modules/uploads/__tests__/storage.test.ts`).
- **Integration tests** (`src/modules/*/__tests__/routes.test.ts`) — each spins up a bare Express
  app around just that module's router (`test-utils/buildTestApp.ts`) against a fresh in-memory
  SQLite DB (`test-utils/setupTestDb.ts`) and drives it with `supertest`. Covers auth (signup/
  login/OTP demo-mode/rate limiting), visitors (register → approve/reject → entry/exit, guest
  passes, role-scoped visibility), complaints (create/list/status updates, role scoping), and
  bills (creation, role-scoped listing, the Razorpay order/verify HMAC flow — with a mocked
  Razorpay SDK exercising both a valid and a forged signature — mock-pay, and the bulk
  `/bills/mark-paid` endpoint).
- Socket.IO (`socketEvents`) and push notifications (`notifyUser`) are mocked in route tests
  that touch them — they're side effects outside the HTTP contract under test, and the real
  Socket.IO server isn't running in this harness.
- `test-utils/uuidMock.js` stands in for the `uuid` package, which ships ESM-only and isn't
  directly importable under Jest's CommonJS test environment; the mock uses Node's built-in
  `crypto.randomUUID()` instead, which is behaviorally equivalent for these tests.

Not yet covered: `amenities`, `bookings`, `notices`, `polls`, `staff`, `users` route modules, and
the Postgres driver path (tests run against the sqlite driver only). The same
`buildTestApp`/`setupTestDb`/`createTestUser` helpers extend directly to those modules if you
want to add more.

## CI/CD

`.github/workflows/backend-ci.yml` runs on every push/PR to `main`: install → typecheck → test →
build. Assumes this repo is deployed independently (see "Switching to Postgres" above for the
production DB setup) — if all three Portl projects end up in one monorepo instead, see the
comment at the top of the workflow file for the adjustment.
