import { Counter, Gauge } from 'prom-client';
import { registry } from '../middlewares/observability.middleware';
export const bookings = new Counter({ name: 'restivio_bookings_total', help: 'Booking workflow outcomes', labelNames: ['outcome'], registers: [registry] });
export const idempotencyReplays = new Counter({ name: 'restivio_idempotency_replays_total', help: 'Replayed booking requests', registers: [registry] });
export const outboxDeliveries = new Counter({ name: 'restivio_outbox_deliveries_total', help: 'Outbox delivery attempts', labelNames: ['outcome'], registers: [registry] });
export const outboxState = new Gauge({ name: 'restivio_outbox_events', help: 'Durable outbox records by state', labelNames: ['status'], registers: [registry] });
