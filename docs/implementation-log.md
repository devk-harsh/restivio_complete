# Local completion log

Baseline: `9d40962` (transactional room reservation and release). Working tree was clean.

Inspected all three services, controllers, routes, validators, DTOs, repositories,
models, migrations, templates, queue/worker, configuration and relevant Git history.
Baseline `npm run typecheck` and `npm run build` passed in all three services.

Preserve the physical room/date inventory, row locks, conditional assignment,
availability calculation, CRUD/repository layers, migration history, templates,
BullMQ worker, Winston and AsyncLocalStorage correlation context.

Required changes: local JWT/RBAC, hotel ownership, server-derived booking data,
client idempotency, HTTP inventory orchestration/compensation, transactional
outbox, event ingestion/deduplication/DLQ, tests, local stack and documentation.

Audit findings: HotelService replaces incoming correlation IDs; Hotel/Booking
error middleware assumes every exception has a status; notification completion
removes BullMQ jobs (incompatible with durable event-ID deduplication); booking
amount model and migration disagree on decimal versus integer storage.

Completed incrementally:

- AuthService with bcrypt, 15-minute access JWTs, hashed seven-day rotating refresh
  tokens, HTTP-only cookies, revocation, current-user endpoint and local role seeds.
- JWT verification, role checks, owner-only hotel mutations and shared-secret internal APIs.
- Evolved Booking/idempotency models via new migrations; identity is token-derived,
  allocation and price come from the existing HotelService reservation algorithm.
- Durable pending requests, compensation/recovery, idempotent cancellation and a small
  inventory reservation ledger to fence late reserve requests after release.
- Transactional outbox, bounded retrying dispatcher, event-to-template mapping,
  deterministic BullMQ jobs, retained failures and diagnostic DLQ.
- Four service health/metrics endpoints, one provisioned Grafana dashboard, local SMTP,
  Docker Compose, service-owned DB users, OpenAPI, CI and root developer documentation.
- Jest/Supertest unit and real integration/failure tests. Exact observed results are in
  [verification.md](verification.md).

Additional justified corrections: unknown exceptions now reach a 500 handler safely;
SQL query logging is disabled to avoid unnecessary data exposure; notification template
names are restricted; local SMTP does not require credentials; completed BullMQ jobs
are retained for replay protection; Swagger uses the serving service's own origin.

Original migrations are unchanged. New schema files are dated `20261005`; original
history and prior service architecture remain available in Git. External booking
confirmation is now automatic and cancellation is `/api/v1/bookings/:id/cancel`.
