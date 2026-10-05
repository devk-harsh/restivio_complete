import { Counter } from 'prom-client';
import { registry } from '../middlewares/observability.middleware';
export const reservations = new Counter({ name: 'restivio_reservations_total', help: 'Inventory reservation outcomes', labelNames: ['outcome'], registers: [registry] });
export const releases = new Counter({ name: 'restivio_inventory_releases_total', help: 'Idempotent room releases', registers: [registry] });
