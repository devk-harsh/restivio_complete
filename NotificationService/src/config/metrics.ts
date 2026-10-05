import { Counter, Gauge } from 'prom-client';
import { registry } from '../middlewares/observability.middleware';
export const emailJobs = new Counter({ name: 'restivio_email_jobs_total', help: 'Email queue outcomes', labelNames: ['outcome'], registers: [registry] });
export const emailQueueState = new Gauge({ name: 'restivio_email_queue_jobs', help: 'Current email queue state', labelNames: ['state'], registers: [registry] });
