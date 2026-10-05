# Verification — 5 October 2026

Verified locally in the existing repository, starting from `9d40962`. No remote
push, branch modification or remote CI execution was performed.

| Check | Observed result |
| --- | --- |
| Baseline builds/typechecks | All three original services passed before editing |
| Final `npm run typecheck` | All four services passed |
| Final `npm run build` | All four services passed |
| `npm test` | 26 tests passed |
| `TEST_CHAOS=true npm run test:integration` | 10 tests passed against real Compose services; no skips |
| Compose build/start/wait | All nine containers running; all four service readiness checks healthy |
| Prometheus | Four active service targets reported `up`; query returned request metrics |
| Grafana | Provisioned dashboard API returned ten panels; charts visibly rendered live data |
| Swagger | Service-specific Booking API page rendered; all service docs/spec endpoints returned 200 |
| MailHog | Confirmation and cancellation messages found with matching recipient and booking ID |
| Git whitespace | `git diff --check` passed |

The integration suites exercise:

- Registration, duplicate email rejection, invalid login/JWT, authenticated profile,
  hashed refresh persistence, rotation, concurrent refresh consumption and logout.
- USER RBAC rejection; manager ownership; another manager denied hotel/category/
  inventory writes; ADMIN access; public hotel and availability reads.
- Inventory generation, immutable room count after generation, and category deletion guards.
- Server-derived identity and price, missing idempotency header rejection, and untrusted
  client amount rejection.
- Six concurrent duplicate booking requests: one booking and one two-night reservation,
  identical responses, and 409 for a changed intent with the same key.
- Ten competing booking requests: exactly two confirmed bookings for two physical rooms;
  eight clean conflicts; four unique room/date rows assigned to two distinct bookings.
- Eight direct HotelService requests bypassing Redis: exactly two successes and six conflicts.
  A reservation retry after release cannot resurrect the inventory.
- Booking ownership/list filtering, cancellation, repeated cancellation, exactly one
  cancellation event, and restored availability.
- Confirmation outbox to NotificationService to BullMQ to MailHog; repeated event
  ingestion retains one logical job and one successful processing attempt.
- NotificationService stopped: booking still confirms, outbox stays pending and records
  a failed attempt; restart delivers it. Resetting the publish marker reproduces a
  delivery retry after queue acceptance without sending a second logical job.
- MailHog stopped: SMTP processing fails three times, retains the failed source job and
  copies event ID, booking ID, reason and attempts into `email-dlq`.
- Fixture-specific database trigger rejects CONFIRMED persistence after reservation:
  booking is compensated, inventory released, no confirmation event committed, and
  retry replays the terminal error. Only the test administrator creates the trigger.
- Simulated interrupted request leaves a durable aged PENDING booking and reserved
  inventory; the running recovery loop releases it and finalizes the failed request.

During verification, a skipped test file initially opened a Redis queue without running
its cleanup hook; resource creation was moved into setup hooks and Jest now exits cleanly.
The first SQL fault-injection attempt was correctly denied to the restricted service
account; the test was changed to use the local test administrator solely for its trigger.

Known boundaries are documented in the README: SMTP is at-least-once, Redis durability
and retained job IDs bound deduplication, and a cancellation write failure after room
release requires retry to finish the booking state change. This is a local educational
stack, not a claim of high availability or production hardening.
