# Frontend verification — 2026-10-05

This records checks actually performed against the local Docker stack. No commits or pushes were made for the frontend task.

## Automated results

| Check | Before integration changes | After integration changes |
| --- | --- | --- |
| All four backend service builds/typechecks | Passed | Passed |
| Backend unit tests | 26 passed | 35 passed (9 exact-origin CORS tests added) |
| Real integration + chaos tests | 10 passed | 12 passed (cookie-origin and preflight tests added) |
| Frontend TypeScript + production build | — | Passed on host and in Docker |
| Frontend Vitest | — | 9 passed |
| Prettier check | — | Passed |
| Git whitespace check | — | Passed |
| Docker Compose startup | Existing 9 services | All 10 services running; application health checks passed |

The frontend tests cover single-flight refresh, retrying concurrent 401 responses once, preserving a booking body/key through retries, failed refresh clearing state, avoiding login-refresh loops, logout/refresh race protection, tab restoration of booking attempts, intent differences, and date/quantity validation. Transport adapters are mocked only inside unit tests. The running application uses real service APIs.

The existing integration suite still exercises backend ownership/RBAC, idempotency/concurrency, inventory correctness, outbox delivery, notification deduplication, MailHog, metrics, and controlled failure/compensation. The GitHub workflow now includes frontend install/build/tests, but no remote CI execution is claimed.

## Browser checks performed

- Registered a fresh local USER, `frontend-demo-20261005@example.com`, through the registration form. The real account was created and automatically logged in.
- Reloaded the browser and observed the same authenticated identity restored from the HTTP-only cookie.
- Opened My bookings for the new account and observed the intentional empty state.
- Browsed the real Restivio Demo Hotel, searched 12–14 October 2026 for one room/two guests, and received a ₹5,000 server estimate.
- Created booking **#109** through the UI. Confirmation displayed CONFIRMED, ₹5,000, and allocated room **100001**.
- Opened My bookings, confirmed cancellation in the dialog, and observed CANCELLED with no further cancel button.
- Directly opened `/manager` and `/admin` as USER; both showed access denied and no privileged forms.
- Logged out from a protected route, observed the login redirect, then reloaded and remained logged out.
- Logged in with the seeded HOTEL_MANAGER. Created owned hotel **#45**, “Frontend Verification Hotel”, and edited its address.
- Created DELUXE category **#39**, changed its nightly price from ₹3,400 to ₹3,500, and generated inventory for 5 October–4 November inclusive. The real response reported **31 rows / 31 days**.
- Opened hotel availability from the manager dashboard and observed one room and a ₹7,000 two-night estimate.
- Entered an incorrect password and observed a clear invalid-credentials message; then logged in with the seeded USER.
- Requested two rooms where only one existed: observed the no-availability message and unavailable category state.
- Opened two independent review tabs for the last room. One created booking **#110**, CONFIRMED at ₹7,000 with room **3900001**. Submitting the stale review in the other tab produced the real conflict error with a Search again action; no second allocation was shown.
- Cancelled #110 through the detail-page dialog and observed CANCELLED.
- Logged in with the seeded ADMIN; viewed the all-hotel dashboard and the real all-bookings view, including other users' bookings and the first 50-record page.
- Inspected the desktop design and actual homepage rendered in 390px phone and 768px tablet frames. Neither had horizontal document overflow. The in-app browser's viewport override had no effect, so sized browser frames were used for these layout checks. Native mobile-device interaction is not claimed.
- Read MailHog after #110: its inbox contained **Booking Confirmed** and **Booking Cancelled** for the demo USER.
- Final production bundle was rebuilt and served by the healthy nginx frontend container, with direct SPA routes working.

Browser-created fixture records remain local; successful test bookings #109 and #110 were cancelled. Existing backend test fixtures remain visible as real data. No database was reset or truncated. Failed booking attempts may appear as CANCELLED with zero amount, reflecting the existing backend's compensation behavior.

## Minimal backend changes

Only seven backend source files changed:

| File | Reason |
| --- | --- |
| AuthService/src/middlewares/cors.middleware.ts (new) | Exact frontend-origin CORS, credential support, preflight and required headers |
| HotelService/src/middlewares/cors.middleware.ts (new) | Same CORS integration for public and bearer APIs |
| BookingService/src/middlewares/cors.middleware.ts (new) | Same CORS integration including Idempotency-Key |
| AuthService/src/app.ts | Mount CORS before routes |
| HotelService/src/app.ts | Mount CORS before routes |
| BookingService/src/app.ts | Mount CORS before routes |
| AuthService/src/routers/auth.router.ts | Add FRONTEND_ORIGIN to the existing origin/CSRF guard, retaining AUTH_ORIGIN |

No services/controllers/models/migrations, reservation algorithm, outbox, Redis/Redlock, BullMQ, notification templates, Swagger, Prometheus or Grafana implementation was redesigned or replaced.

Compose adds a frontend image (Vite build served by nginx) at loopback port 5173 and propagates FRONTEND_ORIGIN. Public VITE service URLs are build arguments. The example environment and READMEs document this. Refresh-token cookie settings remain unchanged.

## Scope and limitations

No known blocking issue remains in the requested local flows. This is a local demonstration, not a production deployment. There is no payment system, room-capacity metadata, image-upload API or user-management admin API; the UI does not invent these. Booking totals and room allocation remain backend-authoritative. The existing category deletion/room-count restrictions are preserved. Destructive category deletion and hotel soft deletion are implemented against the inspected contracts; they were not separately exercised in the browser during this pass.

The local run commands, exact URLs, all three demo accounts, environment variables, auth behavior and folder structure are in [Frontend/README.md](../Frontend/README.md). Screenshot: `artifacts/frontend/home-desktop.jpg` (local ignored artifact).

## Usability follow-up

Archived 44 known legacy test hotels using the existing soft-delete API, preserving history. Prepared two bookable demo hotels through real manager APIs. The active catalog is now Restivio Demo Hotel, The Courtyard Jaipur and Cedar House Manali. Integration teardown removes only hotel IDs created by that test run.

Host and Docker frontend builds passed; 9 frontend tests, 37 backend unit tests and 12 real integration/chaos tests passed. After the integration run the catalog still contained exactly the three demo hotels. Browser checks passed for live prices, searching all three properties, filtering to Jaipur, carrying dates into hotel details, and automatically displaying DOUBLE/SUITE availability and server totals.

Final browser follow-up: Guest shortcut filled the seeded credentials, real login returned to the chosen room, booking #132 confirmed The Courtyard Jaipur at INR 5,600 with allocated room 4000001, and cancellation succeeded. The test booking was cancelled. Updated screenshot: artifacts/frontend/clean-hotel-collection.jpg. No backend implementation files changed in this usability follow-up.
