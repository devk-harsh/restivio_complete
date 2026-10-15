# Restivio frontend

React 19 + TypeScript + Vite, React Router, Axios, React Context and plain responsive CSS. The root folder is consistently named **Frontend/**. No business API is mocked. Decorative CSS hotel illustrations are labelled as illustrations, not property photographs.

## Run the complete application

From the repository root, with Docker Desktop running:

```powershell
# First run only; keep your existing .env if present.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d --build --wait --wait-timeout 240
```

Open **http://localhost:5173**. Compose builds the frontend and serves the production bundle with nginx, including SPA route fallback. It also starts all existing backend services and supporting tools. No host Node installation is needed for this option.

`-d` runs containers in the background; `--wait` waits for startup/health; `--wait-timeout 240` permits up to four minutes for startup. These flags are convenient, not required: `docker compose up --build` also works.

Stop without removing containers or data: `docker compose stop`. Restart: `docker compose start`. After `docker compose down`, recreate containers with `docker compose up -d --wait --wait-timeout 240`. Do not add `--volumes` unless intentionally discarding database data.

## Develop with Vite

Keep the backend Compose stack running and stop the nginx frontend to free port 5173:

```powershell
docker compose stop frontend
cd Frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Use http://localhost:5173 consistently. Do not mix localhost and 127.0.0.1: the refresh cookie is same-site. Stop Vite with Ctrl+C before `docker compose start frontend`.

```powershell
npm run build
npm test
npm run typecheck
npx prettier --check src vite.config.ts
```

## Configuration

| Variable | Default browser URL |
| --- | --- |
| VITE_AUTH_SERVICE_URL | http://localhost:3000 |
| VITE_HOTEL_SERVICE_URL | http://localhost:3001 |
| VITE_BOOKING_SERVICE_URL | http://localhost:3002 |

Set these in `Frontend/.env` for Vite development. For Compose, set the same build arguments in the **root .env**, then rebuild the frontend. Vite values are public build-time configuration: never put secrets in a `VITE_*` variable.

The backend reads `FRONTEND_ORIGIN` (default http://localhost:5173), propagated by Compose to its services. Change it to the exact frontend origin when using another local port. Auth also retains its existing `AUTH_ORIGIN` for Swagger. Only an exact allowed origin receives credentialed CORS headers; no wildcard is used. Cross-site HTTPS hosting is outside this local setup and would require deliberately reviewing the existing same-site cookie policy.

## Structure and pages

```text
Frontend/
  src/
    api/          Axios clients, auth/hotel/booking API modules and refresh tests
    components/   Forms, cards, feedback, loaders and accessible native dialogs
    context/      In-memory authentication and startup restoration
    hooks/        Small asynchronous page-loading hook
    layouts/      Navbar and footer
    pages/        Home, hotels, auth, booking flows and hotel management
    routes/       Authentication and role route guards
    types/        Interfaces matching actual backend responses
    utils/        Dates, currency, safe errors and persistent booking attempts
    styles.css    Responsive styles and decorative hotel illustrations
  Dockerfile      Vite build → nginx production image
  nginx.conf      SPA fallback and static cache policy
  .env.example    Public service URL examples
```

Routes: `/`, `/hotels`, `/hotels/:id`, `/register`, `/login`, `/book`, `/bookings`, `/bookings/:id`, `/manager`, `/admin`, `/admin/bookings`.

## Authentication and roles

Access tokens live only in module memory. AuthContext restores a session by calling the real refresh endpoint with credentials, then `me`. The refresh token stays in AuthService's existing HTTP-only cookie, scoped to `/api/v1/auth`. Axios attaches the bearer token to protected API calls. Concurrent 401s share one refresh request; each original request is retried once. Refresh failure clears state and protected routes redirect to login. Logout calls the real revocation endpoint before clearing local state.

Registration creates the backend's normal USER account, then signs in. HOTEL_MANAGER and ADMIN accounts are seeded/provisioned by the backend, not selected in the registration form.

USER gets the booking flow. HOTEL_MANAGER also gets owned hotel/category/inventory management. ADMIN gets all active hotels and the backend's all-bookings view. Direct access to a wrong-role route is denied. UI guards are navigation conveniences; backend RBAC and ownership remain authoritative.

## Booking integrity

The review page creates one UUID per attempt. It stores only the UUID, booking intent, and submitted marker in tab-scoped sessionStorage, separated by user ID. No authentication tokens are persisted. A network failure, 5xx or page reload retains that key. Retrying sends the same body and key. A different pending intent requires an explicit new-attempt choice; users can inspect My bookings first. Successful and definitive 4xx responses complete the attempt. Availability comes from HotelService; final amount and room allocation come from BookingService. A queued confirmation notice never claims email delivery.

Availability is per room, not per guest capacity: the current backend has no room-capacity metadata. Guests are passed to BookingService without invented capacity rules. Checkout is exclusive (1–30 nights). Inventory generation includes both start and end dates (1–366 days). Room count cannot change after inventory is generated, and a category containing inventory cannot be deleted. These existing restrictions are surfaced in the UI.

## Local accounts and tools

All three demo accounts use **RestivioDemo123!**:

| Role | Email |
| --- | --- |
| USER | user@restivio.local |
| HOTEL_MANAGER | manager@restivio.local |
| ADMIN | admin@restivio.local |

The manager owns Restivio Demo Hotel, with a DOUBLE category and rolling seeded inventory. Use the local demo maintenance command below to remove known leftover fixtures from the active collection; the UI does not substitute business data.

| Application / tool | URL |
| --- | --- |
| Restivio | http://localhost:5173 |
| Auth Swagger | http://localhost:3000/docs |
| Hotel Swagger | http://localhost:3001/docs |
| Booking Swagger | http://localhost:3002/docs |
| Notification Swagger | http://localhost:3003/docs |
| MailHog | http://localhost:8025 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3004/d/restivio-overview |

Grafana example login: `admin` / `restivio-local-grafana`. Developer tools are intentionally separate from the customer UI.

## Demo

1. Register or log in as USER. Open Restivio Demo Hotel, choose dates in the next 90 days, and search for one room.
2. Choose DOUBLE, review the server estimate, and confirm. Inspect the real ID, amount, allocated rooms and status.
3. Refresh the browser to verify cookie-based restoration. Open My bookings, cancel, and observe CANCELLED.
4. Log out and sign in as HOTEL_MANAGER. Open Manager dashboard, select an owned hotel, edit it, manage categories, generate inventory, then inspect availability.
5. Log in as ADMIN to inspect hotels and all bookings.
6. Separately open MailHog for the confirmation/cancellation email, Swagger for APIs, and Grafana for metrics.

Actual verification evidence and limitations are recorded in [frontend verification](../docs/frontend-verification.md).

## Clean, bookable demo collection

Run from the repository root with the stack running:

```powershell
npm run demo:prepare                 # preview exact changes
npm run demo:prepare -- --apply      # apply local demo maintenance
```

This local-only script uses existing APIs to soft-delete known integration/browser fixtures and prepare The Courtyard Jaipur and Cedar House Manali with real room categories and 90 days of inventory. Restivio Demo Hotel remains available. It matches the exact fixture name/address/location signatures, saves their records under ignored artifacts/demo, and preserves booking history and unrelated hotels. It never resets the database. Integration tests now track and soft-delete the hotel IDs they create at teardown; interrupted test runs can be cleaned with this script.

The collection now shows live starting prices, filters locations within the actual loaded hotel list, and checks the existing per-hotel availability endpoint when Find available rooms is submitted. Hotel details automatically check the carried dates. No new business endpoints or mocked hotel data were added.

For quick local testing, the login page has Guest, Hotel manager and Administrator buttons that fill the seeded credentials; you still submit the real login form. They are enabled only by VITE_DEMO_MODE=true (Compose derives it from SEED_DEMO). Disable this flag for non-demo builds.
