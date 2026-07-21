# Portl — Society Management App (Mobile)

Mobile-first community management app built with **Expo SDK 54 + React Native + TypeScript**,
wired up to a real backend (see `../portl-backend`). Visitor approvals, guest QR passes, amenity
booking, helpdesk tickets, notices, polls and maintenance dues — for Residents, Security Guards
and Society Admins.

## Tech stack

- **Expo SDK 54**, React Native 0.81, TypeScript, Expo Router (file-based, typed routes)
- **NativeWind v4** for styling — ember-orange design system, not the yellow/purple every other
  society app uses
- **Zustand** for auth/session state, **@tanstack/react-query** for all server state
- **Socket.IO client** for live visitor/notice/ticket updates
- **expo-notifications** for push, **expo-camera** for QR scanning, **react-native-qrcode-svg**
  for QR generation, **expo-sqlite** + **@react-native-community/netinfo** for the Guard app's
  offline outbox
- **expo-secure-store** for JWT/session persistence

## Getting started

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your backend (see below)
npx expo start
```

Press `i` / `a` for a simulator/emulator, or scan the QR with Expo Go (SDK 54).

### Connecting to the backend

Start the backend first (`../portl-backend`, see its README) — `npm install && npm run seed &&
npm run dev`. Then point this app at it via `.env`:

```
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000
```

- Physical device: use your computer's LAN IP (`localhost` on the phone means the phone itself).
- Android emulator: `http://10.0.2.2:4000`.
- iOS simulator: `http://localhost:4000` usually works.

**The app works fine without the backend running, too.** Every screen tries the real API first;
if it's unreachable, it falls back to realistic local mock data (see "Live vs. mock mode" below).
This means you can demo the whole app cold, no backend required — or run the backend for the full
experience with real persistence, real-time updates, and push notifications.

### Demo credentials

Enter any phone number and OTP **`1234`** — unless the backend has Twilio configured, in which
case a real SMS code is sent instead (the login screen calls `/auth/request-otp` first and adapts
automatically; see `portl-backend`'s README).

| Role | Demo phone |
|---|---|
| Resident (Priya Menon, A-1005) | 9876543210 |
| Security Guard (Rohit Yadav) | 9876500000 |
| Society Admin (Mrs. Sharma) | 9876511111 |

## Live vs. mock mode

`store/authStore.ts` tries `POST /auth/verify-otp` on login. If the backend responds, the session
is "live" — every screen reads/writes through `services/api.ts` (JWT-authenticated fetch) via the
hooks in `hooks/`. If the backend can't be reached (`ApiUnreachableError`), it falls back to the
matching mock account from `services/mockData.ts` and every hook serves local mock data instead —
mutations (approve visitor, vote, pay bill, etc.) just update the UI optimistically without a
network call. You can see which mode you're in by whether actions actually persist across an app
reload.

## What's built

**Auth** — phone → OTP → JWT session (real backend or mock fallback), persisted via
`expo-secure-store`, gated centrally in `app/_layout.tsx`.

**Resident** (`app/(resident)/`) — dashboard with live pending approvals/dues/notice/poll
previews, visitor activity feed, amenity booking with real slot-conflict checking, helpdesk
tickets, and a menu to notices/polls/payments/staff directory.

**Guard** (`app/(guard)/`) — gate dashboard with live stats and mark-entry/exit, visitor
registration with **live flat search/autocomplete** against real flats (`hooks/useFlats.ts` →
`GET /flats`) — shows a ✓ "Matches &lt;owner&gt;'s flat" confirmation for a real match, or a ⚠
warning if the typed flat doesn't match anything, so a typo doesn't silently create a request that
notifies no one — plus a QR pass scanner (`app/guard-scan.tsx`, `expo-camera`), searchable
history, and an **offline banner** that queues actions in a local SQLite outbox and auto-syncs
when connectivity returns (`services/offlineQueue.ts`, `hooks/useOfflineSync.ts`).

**Admin** (`app/(admin)/`) — KPI overview, ticket queue with one-tap status progression, notice
broadcaster (pushes to every resident via the backend), management shortcuts.

**Shared flows** — the "someone's at the gate" approval screen (now wired to real
approve/reject), guest pre-approval with a **real scannable QR code**, notices, live-updating
polls, payments (mock-pay by default, Razorpay order/verify endpoints ready on the backend), staff
directory, and a real **in-app notifications inbox** (`app/notifications.tsx`) — the bell icon on
every home screen now opens it and shows a live unread-count badge, instead of being decorative.
Backed by a real `notifications` DB table (not just fire-and-forget OS push — see
`portl-backend/API_REFERENCE.md` section 11), currently populated on visitor requests and notice
broadcasts; extending it to complaint/poll events follows the same pattern.

**Real-time & push** — `services/socket.ts` connects to the backend's Socket.IO server on login
(residents auto-join their flat's room); `hooks/usePushNotifications.ts` registers the device's
Expo push token with the backend and routes notification taps straight to the visitor-approval
screen.

## Project structure

```
app/
  (auth)/            welcome, login, otp
  (resident)/         tab navigator: home, visitors, amenities, helpdesk, more
  (guard)/             tab navigator (+ offline banner): gate, register, history, profile
  (admin)/              tab navigator: overview, complaints, notices, more
  visitor-approval.tsx, visitor-preapprove.tsx    modal flows (QR pass generation)
  guard-scan.tsx                                    QR scanner (expo-camera)
  notices.tsx, polls.tsx, payments.tsx, staff-directory.tsx, profile.tsx
components/          Button, Card, Badge, Avatar, EmptyState
constants/            theme.ts — raw color tokens
hooks/                 useVisitors, useComplaints, useNotices, usePolls, useBills, useStaff,
                        useAmenities, usePushNotifications, useOfflineSync — every hook tries the
                        live API first and falls back to mock data automatically
services/
  api.ts                fetch client — JWT header, timeout/offline detection, typed helpers
  socket.ts              Socket.IO client wrapper
  offlineQueue.ts         expo-sqlite outbox for the Guard app
  mockData.ts              fallback data used when the backend is unreachable
store/authStore.ts    Zustand — session, live/mock mode, login/logout
types/                  shared TypeScript types for every domain entity
```

## Testing

`npm test` runs Jest (via `jest-expo`, pinned to `~54.0.17` to match Expo SDK 54/React 19.1) +
React Native Testing Library v14 (async `render`/`fireEvent` — see
`test-utils/jestSetup.ts` for global mocks like `expo-haptics`).

Covered so far:

- **Components** (`components/__tests__/`) — `Button` (label, press, disabled, loading, a11y
  role/label) and `Badge`/`Chip`.
- **Screens** (`app/__tests__/`) — `visitor-approval.tsx` (the core approve/deny/leave-at-gate
  flow from the PRD: shows visitor details, approve/reject call the mutation with the right
  action and navigate back, "leave at gate" resolves locally without hitting the API, "no visitor
  found" and fallback-to-first-visitor edge cases) and `visitor-preapprove.tsx` (guest gate-pass
  generation: validation, QR pass display, "Done" navigates back).

Screen tests mock the relevant data hook (e.g. `@/hooks/useVisitors`) and `expo-router` rather
than wiring up a full `QueryClientProvider` + live API — this keeps them fast and focused on the
screen's own logic (which action gets called, what renders in each state) rather than re-testing
react-query or the API client.

**Not yet covered**: most other screens (home, amenities, helpdesk, notices, polls, payments,
staff-directory, admin screens, guard-scan), the hooks themselves in isolation, and Detox E2E for
the full visitor-approval flow end-to-end on a device/simulator (PRD's stated priority order is
Jest → RNTL → Detox last; Detox needs a running simulator/emulator and isn't runnable in this
sandbox). The `Button`/`Badge` and `visitor-approval`/`visitor-preapprove` tests establish the
pattern (mock native modules in `jestSetup.ts`, mock data hooks + `expo-router` per screen,
`await render(...)`/`await fireEvent...` throughout) to extend to the rest.

## CI/CD

`.github/workflows/mobile-ci.yml` runs on every push/PR to `main`: install → typecheck → Jest
tests → `expo export --platform web` as a fast bundler sanity check (catches import/bundling
errors without needing EAS credentials or a native build). Real device builds still go through
`eas build` once the EAS project is linked — see "Getting started" above. Assumes this repo is
deployed independently — if all three Portl projects end up in one monorepo instead, see the
comment at the top of `portl-backend/.github/workflows/backend-ci.yml` for the adjustment.

## Accessibility

Every `Pressable`/`TouchableOpacity` across `app/` and `components/` now carries an explicit
`accessibilityRole="button"` and a descriptive `accessibilityLabel` — especially the visitor
approve/deny/leave-at-gate actions (`visitor-approval.tsx`, `visitor-preapprove.tsx`,
`(resident)/visitors.tsx`, `(resident)/index.tsx`, `(guard)/index.tsx`), which the PRD calls out
specifically. Selection-style controls (category pickers, filter chips, poll options, duration
pickers) also set `accessibilityState={{ selected }}` so screen readers announce the current
choice, not just its label.

Two deliberate exceptions, left as-is rather than "fixed": the notification bell icons on the
resident/admin home screens and the "Resend code" link on the OTP screen have no `onPress`
handler in this build (dead controls carried over from the original design). Adding
`accessibilityRole="button"` to something that doesn't respond to a tap would be worse than
leaving it unlabeled — it'd tell a screen reader user to expect an action that never happens.
Wire up the real behavior first, then label it.

`visitor-approval.test.tsx` has a dedicated test asserting the approve/deny/leave-at-gate labels
exist, as a regression guard on the PRD's stated priority screen.

## Localization

English, Hindi, and Kannada via `i18next` + `react-i18next`, with `expo-localization` detecting
the device's language on first launch and `expo-secure-store` (already a dependency, used for
auth tokens) persisting the user's choice across launches.

- `localization/i18n.ts` — setup, `initI18n()` (called once in `app/_layout.tsx` before anything
  renders, alongside font loading and auth hydration), and `setLanguage()`.
- `localization/locales/{en,hi,kn}.json` — the three dictionaries. `localization/__tests__/
  locales.test.ts` asserts all three have identical key sets, no empty strings, and matching
  `{{placeholder}}` interpolations, so a translation can't silently drift out of sync as new keys
  get added.
- `components/LanguageSwitcher.tsx` — a row of language chips, dropped into each role's settings
  screen (resident `more.tsx`, guard `profile.tsx`, admin `more.tsx`) so switching is actually
  reachable and demoable, not just wired in code.

**Fully wired**: the entire first-run → visitor-approval path — `welcome.tsx`, `login.tsx`,
`otp.tsx`, `visitor-approval.tsx` (the PRD's priority screen), `visitor-preapprove.tsx`,
`(resident)/index.tsx`, `(guard)/index.tsx`, all three tab-layout titles, the guard offline-sync
banner (including pluralized "N actions will sync" via i18next's `_one`/`_other` suffixes), and
the logout confirmation dialogs.

**Not yet wired**: `(resident)/visitors.tsx`, `(resident)/helpdesk.tsx`, `(resident)/amenities.tsx`,
`(admin)/complaints.tsx`, `(admin)/notices.tsx`, `payments.tsx`, `polls.tsx`, `notices.tsx`,
`staff-directory.tsx`, `guard-scan.tsx`, `(guard)/register.tsx`, `(guard)/history.tsx`, and the
menu item labels in the `more.tsx` screens — these all still have hardcoded English JSX text. The
pattern is entirely mechanical from here: `import { useTranslation } from "react-i18next"`, call
`const { t } = useTranslation()` in the component, add the missing keys to all three locale files
(the sync test will immediately flag if one is missed), and replace each string with `t("...")`.

Kannada and Hindi translations were written directly rather than machine-translated, but haven't
been reviewed by a native speaker — worth a pass before shipping.

## What's still open

- Razorpay checkout (`app/razorpay-checkout.tsx`) uses a WebView loading Razorpay's hosted
  Checkout.js — this needs real `RAZORPAY_KEY_ID`/`SECRET` on the backend and outbound internet
  from the device to `checkout.razorpay.com` to actually test a payment; the code path is wired
  end-to-end (order → WebView checkout → signature verify) but wasn't runnable in this sandbox
  (no internet to Razorpay's CDN). Falls back to the `/pay/mock` shortcut if the backend reports
  Razorpay isn't configured.
  Every module still follows the same fetch → hook → screen pattern, so adding retry/backoff or
  pagination is incremental from here.
