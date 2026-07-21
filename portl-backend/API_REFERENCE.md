# Portl Backend — Full API Reference

Every route in `portl-backend`, what it does internally, which screen/hook calls it on the
mobile app or admin dashboard, and how to call it yourself. Base URL is whatever
`EXPO_PUBLIC_API_URL` / the admin dashboard's API base is set to (`http://localhost:4000` by
default — see each project's README for how that's configured).

**Conventions used below:**
- 🔒 role — which role(s) the route requires. No lock = any authenticated user. 🌐 = public, no auth needed.
- All authenticated routes need `Authorization: Bearer <accessToken>`.
- All request/response bodies are JSON unless noted.
- "Called from" lists every screen/hook that calls the route today. If nothing is listed, it's implemented but not yet wired to any UI.

---

## 1. Auth — `/auth/*` (`src/modules/auth/routes.ts`)

Handles the phone+password path (used mainly by the admin/guard onboarding flow) and the phone+OTP
path (used by the actual mobile login screens). Both issue the same JWT pair at the end.

### `POST /auth/signup` 🌐 — rate-limited (20/15min)
Creates a new account with name/phone/password/role. Rejects if the phone is already registered
(`409`). Returns the same `{ user, accessToken, refreshToken }` shape as login.
- **Called from:** not currently wired to any mobile/admin screen — the app's real user-facing
  flow is OTP-based (`/auth/verify-otp`, below). This route exists for completeness / non-OTP
  clients (e.g. a future web portal, or scripts seeding test accounts).
- **Example:**
  ```
  POST /auth/signup
  { "name": "Priya Menon", "phone": "9876543210", "password": "demo1234", "role": "resident", "flatLabel": "A-1005", "towerName": "Tower A" }
  → 201 { "user": {...}, "accessToken": "...", "refreshToken": "..." }
  ```

### `POST /auth/login` 🌐 — rate-limited (20/15min)
Phone + password login. `401` on wrong phone or password (same message for both, so you can't
enumerate registered numbers).
- **Called from:** not currently wired to a mobile screen (mobile uses OTP). Available for the
  admin dashboard or any password-based client if you build one.

### `POST /auth/request-otp` 🌐 — rate-limited (5/15min, the tightest limit in the app)
Step 1 of OTP login. If Twilio isn't configured (no `TWILIO_*` env vars), returns
`{ sent: false, demoMode: true }` immediately — no SMS is sent, and the client should show "Demo
OTP: 1234". If Twilio *is* configured, actually sends an SMS via Twilio Verify and returns
`{ sent: true, demoMode: false }`.
- **Called from:** `app/(auth)/login.tsx` — the phone-number entry screen, on "Send OTP" tap.
  Response's `demoMode` flag is forwarded as a route param to the OTP screen so it knows whether
  to show the demo-code hint.

### `POST /auth/verify-otp` 🌐 — rate-limited (5/15min)
Step 2. Verifies the code (real Twilio check if configured, else must match the fixed demo code
`1234`). **Auto-provisions a new user** if the phone number isn't registered yet — this is what
makes the whole app demoable against any phone number/role combo without a separate signup step.
Returns the same `{ user, accessToken, refreshToken }` shape.
- **Called from:** `store/authStore.ts`'s `loginWithOtp()`, which is called by
  `app/(auth)/otp.tsx` on "Verify & continue". This is the actual login path every mobile user
  goes through. Note: `authStore.loginWithOtp()` also has an **offline fallback** — if the
  backend is completely unreachable (not just "not configured"), it falls back to a local mock
  account for the given role so the app stays demoable with zero backend running. That fallback
  never touches this route at all.

### `POST /auth/refresh` 🌐
Exchanges a refresh token for a new access token. Standalone route; not currently called
automatically by the mobile app (there's no silent-refresh-on-401 interceptor yet — see
`services/api.ts` if you want to add one). `401` if the token is invalid/expired.

### `GET /auth/me`
Returns the currently authenticated user (password hash stripped). Not currently called by any
screen — `authStore` keeps the user object from login/OTP response cached in `SecureStore`
instead of re-fetching. Useful for a "refresh my own profile" action if you add one.

---

## 2. Visitors — `/visitors/*` (`src/modules/visitors/routes.ts`)

The core PRD flow: guard registers → resident approves/denies → guard marks entry/exit. Real-time
via Socket.IO (`src/socket.ts`) on top of the HTTP calls, so a resident's phone updates instantly
when a guard registers someone, without polling.

### `POST /visitors` 🔒 guard
Registers a new visitor as `pending`. Emits `visitor-request` over Socket.IO to the room
`flat:<flatLabel>` (so that flat's resident app updates live) and sends an Expo push notification
to every resident of that flat via `notifyUser()`.
- **Called from:** `app/(guard)/register.tsx` via `useRegisterVisitor()` in `hooks/useVisitors.ts`.
  If the backend is unreachable mid-session, the request is queued to
  `services/offlineQueue.ts` and synced automatically once back online (the guard app's offline
  mode — see `hooks/useOfflineSync.ts` and the banner in `app/(guard)/_layout.tsx`).

### `POST /visitors/:id/approve` 🔒 resident
Sets status to `approved`, records `approvedByUserId`. Emits `visitor-approved` to the `guards`
room (so every guard's device sees it update live).
- **Called from:** `app/visitor-approval.tsx` (the flagship approve/deny screen, "Approve"
  button), `app/(resident)/index.tsx` (home screen visitor cards), `app/(resident)/visitors.tsx`
  (visitor list) — all via `useVisitorAction()`.

### `POST /visitors/:id/reject` 🔒 resident
Same as approve but sets `rejected` and emits `visitor-rejected`.
- **Called from:** same three screens as approve, "Deny" button, same `useVisitorAction()` hook.

### `POST /visitors/:id/entry` 🔒 guard
Sets status to `arrived`, stamps `entryTime`. Emits `visitor-entered` to `flat:<flatLabel>`.
- **Called from:** `app/(guard)/index.tsx` ("Mark entry" button on an approved visitor), via
  `useVisitorAction()`.

### `POST /visitors/:id/exit` 🔒 guard
Sets status to `exited`, stamps `exitTime`. Emits `visitor-exited`.
- **Called from:** `app/(guard)/index.tsx` ("Mark exit" button), same hook.

### `GET /visitors` 🔒 any authenticated
List/history. **Role-scoped automatically**: a resident only ever gets their own flat's visitors
(server-side filter — the client can't override this by passing a different `flatLabel`); a guard
or admin can pass `?flatLabel=` to filter, and everyone can pass `?status=pending|approved|...`.
- **Called from:** `hooks/useVisitors.ts`, used by `app/(guard)/register.tsx`,
  `app/(guard)/history.tsx`, `app/(guard)/index.tsx`, `app/(resident)/visitors.tsx`,
  `app/(resident)/index.tsx`, `app/visitor-preapprove.tsx`, `app/visitor-approval.tsx` (reads the
  list and finds the one matching the `id` route param — there's no dedicated
  fetch-single-visitor call from the client even though `GET /visitors/:id` exists below), and the
  admin dashboard's `Visitors.tsx` / `Overview.tsx` pages (unfiltered — admin sees everyone's).

### `GET /visitors/:id` 🔒 any authenticated
Single visitor by ID. Implemented but **not currently called by any screen** — `visitor-approval.tsx`
gets its visitor by filtering the already-fetched list from `GET /visitors` instead. Available if
you want a screen that deep-links to a visitor without fetching the whole list first.

### `POST /visitors/guest-pass` 🔒 resident
Resident pre-approves a guest before they arrive. Generates a short code (`PORTL-XXXXXX`) and a
validity window (`validHours`, default 4, max 72). Returns the pass; the client renders it as a QR
code.
- **Called from:** `app/visitor-preapprove.tsx` via `useGenerateGuestPass()`.

### `GET /visitors/guest-pass/:code` 🔒 guard
Guard scans the QR / types the code. Validates it hasn't been used (`409` if so) and hasn't
expired (`410` if so), marks it used, and **auto-creates an already-approved visitor** in one step
— no separate resident approval needed since they pre-approved it.
- **Called from:** `app/guard-scan.tsx` (the camera QR-scan screen), direct `api.get()` call (not
  through a shared hook).

---

## 3. Bills / Payments — `/bills/*` (`src/modules/bills/routes.ts`)

Two payment paths coexist: the real Razorpay order→checkout→verify flow, and a `/pay/mock`
shortcut for when Razorpay isn't configured (or you're demoing offline). Both end in the same
place — the bill's `status` flips to `paid`.

### `GET /bills` 🔒 any authenticated
Role-scoped like visitors: a resident only sees their own flat's bills; admin sees everyone's.
- **Called from:** `hooks/useBills.ts`, used by `app/payments.tsx`, `app/(resident)/index.tsx`
  (dues card), and admin's `Billing.tsx` / `Overview.tsx` (unfiltered).

### `POST /bills` 🔒 admin
Creates a bill for a flat (`unpaid` by default).
- **Called from:** admin dashboard's `Billing.tsx` ("+ Create bill" form). Not called from the
  mobile app (residents don't create their own bills).

### `POST /bills/:id/pay/order` 🔒 resident
Step 1 of real payment: creates a Razorpay order for the bill's amount (converted to paise) and a
local `payments` row tracking it. `409` if already paid. `503` with Razorpay's own error message
if the SDK call fails (e.g. bad keys).
- **Called from:** `app/razorpay-checkout.tsx` on mount, before opening the WebView checkout.

### `POST /bills/:id/pay/verify` 🔒 resident
Step 2: verifies the HMAC-SHA256 signature Razorpay's Checkout.js hands back
(`sha256(order_id|payment_id, key_secret)`), rejecting forged/tampered payloads with `400`. On
success, flips the bill to `paid` and updates the `payments` row with the real payment ID.
- **Called from:** `app/razorpay-checkout.tsx`, in the WebView's `postMessage` success handler.

### `POST /bills/:id/pay/mock` 🔒 resident
Marks a bill paid with no Razorpay involvement at all — the offline/demo payment path.
- **Called from:** `app/payments.tsx`'s "Pay now" button, but *only* when `authStore.isBackendLive`
  is `false` (no real backend session to check out against — see `payNow()` in that file). When
  the backend **is** live, "Pay now" instead navigates to `app/razorpay-checkout.tsx` for a real
  Razorpay order, and that screen falls back to this same `/pay/mock` route if the backend reports
  Razorpay isn't configured.
  > Note: `payments.tsx`'s "I have paid" button next to it is currently a static row with no
  > `onPress` at all (a placeholder, presumably for a future "mark as pending verification" flow
  > distinct from "Pay now"'s instant payment) — worth wiring up or removing before shipping.

### `POST /bills/mark-paid` 🔒 admin
Bulk reconcile — pass `{ ids: string[] }`, marks every matching bill paid (idempotent, silently
skips unknown IDs). Added this session for the admin dashboard's bulk-actions feature.
- **Called from:** admin dashboard's `Billing.tsx` — select multiple unpaid bills via checkboxes,
  "Mark selected as paid".

---

## 4. Complaints / Helpdesk tickets — `/complaints/*` (`src/modules/complaints/routes.ts`)

### `POST /complaints` 🔒 resident
Raises a ticket, auto-tagged with the resident's own flat. Emits `ticket-updated` over Socket.IO.
- **Called from:** `app/(resident)/helpdesk.tsx` ("Raise a new ticket" form) via
  `hooks/useComplaints.ts`.

### `GET /complaints` 🔒 any authenticated
Role-scoped: resident sees only their own tickets; admin sees all. Both can filter with
`?status=open|assigned|in_progress|resolved|closed`.
- **Called from:** `app/(resident)/helpdesk.tsx`, admin's `Complaints.tsx` and `index.tsx`
  (overview counts), all via `useComplaints()`.

### `PUT /complaints/:id` 🔒 admin
Updates `status` and/or `assignedTo`. Emits `ticket-updated`. `404` if the ticket doesn't exist.
- **Called from:** admin dashboard's `Complaints.tsx` (status-advance button cycling
  open → assigned → in_progress → resolved → closed).

---

## 5. Notices — `/notices/*` (`src/modules/notices/routes.ts`)

### `GET /notices` 🔒 any authenticated
All notices, newest first.
- **Called from:** `hooks/useNotices.ts`, used by `app/(resident)/index.tsx` (latest notice
  card), `app/notices.tsx` (full list), admin's `Notices.tsx`.

### `POST /notices` 🔒 admin
Creates a notice. Emits `new-notice` over Socket.IO **and** sends an Expo push notification to
*every* registered push token in the system (not scoped to one flat — notices are society-wide).
- **Called from:** admin dashboard's `Notices.tsx` ("New notice" form). Not callable from the
  mobile app (residents/guards can't post notices).

---

## 6. Polls — `/polls/*` (`src/modules/polls/routes.ts`)

### `GET /polls`
Returns every poll with computed vote counts per option, `totalVotes`, and — critically — `myVote`
(the requesting user's own vote, if any), computed server-side per-request so the client never has
to reconcile "did I already vote" itself.
- **Called from:** `hooks/usePolls.ts`, used by `app/(resident)/index.tsx` (community poll card),
  `app/polls.tsx` (full list), admin's `Polls.tsx`.

### `POST /polls` 🔒 admin
Creates a poll with ≥2 options. Emits `new-poll`.
- **Called from:** admin dashboard's `Polls.tsx` ("New poll" form).

### `POST /polls/:id/vote` 🔒 resident
Casts a vote. `409` if this user already voted on this poll (checked server-side, so the client
disabling the button after voting is a UX nicety, not the actual safeguard).
- **Called from:** `app/(resident)/index.tsx` and `app/polls.tsx`, via `useVotePoll()`.

### `GET /polls/:id/results`
Standalone results endpoint (id + label + vote count per option, plus total). Implemented but
**not currently called by any screen** — the main `GET /polls` already embeds results inline, so
this is redundant for the current UI. Useful if you build a poll-results-only view later (e.g. a
shareable results link) without pulling every other poll too.

---

## 7. Amenities & Bookings

### `GET /amenities` 🔒 any authenticated — `src/modules/amenities/routes.ts`
Lists bookable amenities (clubhouse, gym, etc.) with their operating hours/slot length.
- **Called from:** `hooks/useAmenities.ts`, used by `app/(resident)/amenities.tsx`, admin's
  `Amenities.tsx`, admin's `index.tsx` (overview).

### `POST /amenities` 🔒 admin
Creates an amenity.
- **Called from:** admin dashboard's `Amenities.tsx` ("New amenity" form).

### `DELETE /amenities/:id` 🔒 admin
Deletes an amenity.
- **Called from:** admin dashboard's `Amenities.tsx` (delete button per row).

### `GET /bookings` 🔒 any authenticated — `src/modules/bookings/routes.ts`
Lists bookings, optionally filtered by `?flatLabel=`, `?amenityId=`, `?date=` (all applied
client-side in the route handler, not as SQL `WHERE` clauses — fine at demo scale, worth revisiting
if the bookings table grows large).
- **Called from:** `hooks/useAmenities.ts` (yes — bookings live in the amenities hook file, not a
  separate `useBookings.ts`), used by `app/(resident)/amenities.tsx` to show which slots are
  already taken for the selected date.

### `POST /bookings` 🔒 resident
Books a slot. Rejects with `409` if another *confirmed* booking already holds that exact
amenity+date+startTime combo (a real double-booking guard, not just a client-side check).
- **Called from:** `app/(resident)/amenities.tsx` ("Confirm booking" after picking a slot).

### `DELETE /bookings/:id`
Cancels a booking (soft-delete — sets `status: "cancelled"`, doesn't remove the row). Only the
original booker or an admin can cancel (`403` otherwise). Implemented but **not currently called
by any screen** — `amenities.tsx` doesn't yet expose a "cancel my booking" action.

---

## 8. Staff directory — `/staff/*` (`src/modules/staff/routes.ts`)

### `GET /staff` 🔒 any authenticated
Lists staff/vendors (name, role, phone, rating, photo).
- **Called from:** `hooks/useStaff.ts`, used by `app/staff-directory.tsx` (the "Call" button
  dials `tel:` the returned phone number directly), admin's `Staff.tsx`.

### `POST /staff` 🔒 admin
Adds a staff member.
- **Called from:** admin dashboard's `Staff.tsx`.

### `DELETE /staff/:id` 🔒 admin
Removes a staff member.
- **Called from:** admin dashboard's `Staff.tsx`.

---

## 9. Users — `/users/*` (`src/modules/users/routes.ts`)

### `GET /users/:id` 🔒 any authenticated
Fetch one user by ID (password hash stripped). Implemented but **not currently called by any
screen** — every screen that needs "the current user" reads it from `authStore` instead of
fetching by ID.

### `PUT /users/:id`
Updates `name`/`avatarUrl`/`languagePref`. Self-service only — `403` unless you're updating your
own record or you're an admin. Implemented but **not currently called by any screen** — there's no
"edit profile" form wired up yet in `app/profile.tsx` despite the route existing.

### `GET /users` 🔒 admin
Full resident/staff directory (password hashes stripped).
- **Called from:** admin dashboard's `Residents.tsx`.

### `POST /users/me/push-token`
Registers (or no-ops if already registered) an Expo push token for the current user, so
`notifyUser()` elsewhere in the backend knows where to send that user's push notifications.
Idempotent — safe to call on every app launch.
- **Called from:** `hooks/usePushNotifications.ts`, called once from `app/_layout.tsx` on
  mount/login, after `Notifications.getExpoPushTokenAsync()` resolves. Needs a real EAS
  `projectId` linked to actually return a usable token on a physical device — see the mobile
  README's "Tier 1" notes.

---

## 10. Towers & Flats — `/towers`, `/flats` (`src/modules/society/routes.ts`)

The society's physical structure. Added this session — the `societies`/`towers`/`flats` tables
existed in the schema and got seeded with one demo tower/flat, but had zero routes and no admin
UI, so there was no way to actually manage them despite being explicitly called out in the PRD
("Society admins should be able to manage: Towers, Flats...").

### `GET /towers` / `GET /flats`
Any authenticated user can list — not admin-gated, since the guard app's visitor-registration
autocomplete (see below) needs to read flats too. `GET /flats` accepts `?towerId=` to filter.

### `POST /towers` / `PUT /towers/:id` / `DELETE /towers/:id` 🔒 admin
Standard CRUD. Delete is guarded: `409` if the tower still has flats assigned (delete/reassign
those first) rather than silently orphaning them.
- **Called from:** admin dashboard's new `Towers.tsx` page.

### `POST /flats` / `PUT /flats/:id` / `DELETE /flats/:id` 🔒 admin
`POST` validates `towerId` actually matches an existing tower (`400` if not). `label` is the same
string format used everywhere else in the app as `flatLabel` (e.g. `"A-1005"`) — see the note
below on how this connects (or doesn't yet) to the rest of the system.
- **Called from:** admin dashboard's `Towers.tsx` page.

> **Honest limitation:** every other module (`users`, `visitors`, `bills`, `complaints`) still
> stores `flatLabel`/`towerName` as free-text strings, not a foreign key into this `flats` table.
> This CRUD makes Towers/Flats a real, independently manageable admin surface, but it doesn't
> retroactively enforce that e.g. a resident's `flatLabel` matches a row here — that'd mean
> migrating every existing string field to a real `flatId` reference, a bigger change than this
> session's scope. `GET /flats` is deliberately open to any authenticated role (not just admin)
> specifically so the guard app's visitor-registration screen can autocomplete against real flats
> instead of a bare text field — see `app/(guard)/register.tsx` and its README note.

---

## 11. Notifications — `/notifications/*` (`src/modules/notifications-api/routes.ts`)

Added this session — a real in-app notification inbox, distinct from the OS-level Expo push
notifications (`src/modules/notifications.ts`) that existed before. Push notifications disappear
once dismissed and only reach a device with a registered token; this persists every notification
as a DB row so there's something to show in-app regardless of push token status.

### `GET /notifications`
Every notification for the requesting user, newest first, `meta` parsed back from its stored JSON
string (e.g. `{ visitorId: "..." }` for deep-linking to the right screen).
- **Called from:** `hooks/useNotifications.ts`, used by `app/notifications.tsx`.

### `GET /notifications/unread-count`
Just the count — cheap enough to poll for the badge on the home-screen bell icon without pulling
every notification's full body.
- **Called from:** `hooks/useNotifications.ts`'s `useUnreadCount()`, used by the bell icon on all
  three home screens (`(resident)/index.tsx`, `(guard)/index.tsx`, `(admin)/index.tsx`).

### `POST /notifications/:id/read`
Marks one notification read. `404` if it doesn't exist *or* belongs to someone else (same
response either way, so you can't probe for other users' notification IDs).
- **Called from:** `app/notifications.tsx`, on tapping a notification (before navigating to
  whatever it deep-links to).

### `POST /notifications/read-all`
Marks every one of the requesting user's notifications read in one call.
- **Called from:** `app/notifications.tsx`'s "Mark all read" action.

**How rows get created** — there's no `POST /notifications` for clients to call directly; rows
are only written server-side via two functions in `src/modules/notifications.ts`:
- `notifyUser(userId, title, body, type, meta)` — one user. Called when a visitor is registered
  (notifies that flat's residents, `type: "visitor"`, `meta: { visitorId }`).
- `notifyAllUsers(title, body, type, meta)` — every user in the society. Called when a notice is
  created (`type: "notice"`, `meta: { noticeId }`).

Both write the in-app row *and* best-effort push to registered Expo tokens — the in-app write
always happens regardless of whether the user has push enabled; the push send is the part that
fails soft. **Not yet wired to complaint status changes or poll creation** (`type: "complaint"`
and `type: "poll"` exist in the schema/enum for exactly this, just unused so far) — extending
either of those routes to call `notifyUser`/`notifyAllUsers` follows the same pattern as visitors/
notices above.

## 12. File uploads — `/uploads-api` (`src/modules/uploads/routes.ts`)

### `POST /uploads-api`
Multipart upload (`multipart/form-data`, field name `file`, images or PDFs, 8MB max). Returns
`{ url, driver }` where `driver` is whichever of `local`/`s3`/`cloudinary` is active via
`STORAGE_DRIVER` — see the backend README's "File storage" section for the env vars each driver
needs.
- **Called from:** **not currently called by any mobile or admin screen.** It's fully implemented
  and driver-agnostic, but nothing in the UI has a file/photo picker wired to it yet — it's a
  ready-to-use building block for whenever you add e.g. a profile photo, a complaint attachment,
  or a visitor ID photo.
- **Example (any client):**
  ```
  POST /uploads-api
  Content-Type: multipart/form-data
  Authorization: Bearer <token>
  file: <binary>

  → 201 { "url": "/uploads/3f9a...png", "driver": "local" }
  ```

---

## Cross-cutting things worth knowing

**Real-time (Socket.IO, `src/socket.ts`).** Six events get emitted server-side:
`visitor-request`/`visitor-entered`/`visitor-exited` (scoped to room `flat:<flatLabel>`),
`visitor-approved`/`visitor-rejected` (scoped to room `guards`), and `new-notice`/`new-poll`/
`ticket-updated` (broadcast to everyone). The mobile app joins the right rooms in
`services/socket.ts`, connected from `authStore` right after login. This is *in addition to* the
HTTP responses above, not a replacement — every mutation still returns a normal JSON response;
the socket event is what makes *other* connected clients (a different resident's phone, every
guard's phone) update without polling.

**Push notifications (`src/modules/notifications.ts`).** `notifyUser(userId, title, body)` looks
up that user's registered Expo push token(s) and sends via Expo's push API, failing soft (a
console warning, not a thrown error) if the token's missing or the push fails — so a
notification failure never breaks the underlying HTTP request that triggered it. Two callers:
visitor registration (notifies the flat's residents) and notice creation (`notifyTokens`,
notifies literally everyone).

**Offline queue (mobile only, `services/offlineQueue.ts` + `hooks/useOfflineSync.ts`).** Only
`useRegisterVisitor()` and `useVisitorAction()` currently queue-and-retry when the backend is
unreachable mid-session (distinct from the "mock mode" fallback used when the backend was never
reachable in the first place — see `authStore.isBackendLive`). No other hook has this yet; if you
add offline support to bills/complaints/etc., `services/offlineQueue.ts`'s `enqueue()` is the
existing pattern to extend.

**Role scoping is always server-side.** Every route that returns a role-filtered list (visitors,
bills, complaints) does the filtering in the route handler based on `req.user.role`/`req.user.sub`
from the verified JWT — never trusting a client-supplied role or ID. A resident cannot see another
flat's data by editing a query param.
