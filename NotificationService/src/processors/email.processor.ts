import { Job, Worker, Queue } from 'bullmq';
import logger from '../config/logger.config';
import { redisConnection } from '../config/redis.config';
import { EmailJobPayload } from '../types/email.types';
import { EMAIL_JOB_NAME, MAILER_QUEUE_NAME, mailerQueue } from '../queues/mailer.queue';
import { renderMailTemplate } from '../templates/template.handler';
import { sendEmail } from '../services/mailer.service';
import { requestContext } from '../utils/context/request.context';
import { emailJobs, emailQueueState } from '../config/metrics';

export const deadLetterQueue = new Queue('email-dlq', { connection: redisConnection });
let workerInstance: Worker<EmailJobPayload> | null = null;
export async function preserveFailedJob(job: Job<EmailJobPayload>, reason: string) {
  await deadLetterQueue.add('email-failed', {
    eventId: job.data.eventId, bookingId: job.data.bookingId, correlationId: job.data.correlationId,
    failureReason: reason, attempts: job.attemptsMade, originalJobId: job.id,
  }, { jobId: job.id!, removeOnComplete: false, removeOnFail: false });
}
export async function refreshQueueMetrics() {
  const counts = await mailerQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  for (const [state, count] of Object.entries(counts)) emailQueueState.set({ state }, count);
  emailQueueState.set({ state: 'dlq' }, await deadLetterQueue.count());
}
export function setupMailerWorker() {
  if (workerInstance) return workerInstance;
  workerInstance = new Worker<EmailJobPayload>(MAILER_QUEUE_NAME, async (job: Job<EmailJobPayload>) => {
    return requestContext.run({ correlationId: job.data.correlationId || 'legacy-email-job' }, async () => {
      if (job.name !== EMAIL_JOB_NAME) throw new Error('Unexpected email job name');
      const payload = job.data;
      logger.info('Mailer worker picked a job', { jobId: job.id, eventId: payload.eventId, bookingId: payload.bookingId });
      const html = await renderMailTemplate(payload.templateId, payload.params);
      await sendEmail({ to: payload.to, subject: payload.subject, html });
      return { message: 'Email sent successfully', eventId: payload.eventId };
    });
  }, { connection: redisConnection, concurrency: 2 });
  workerInstance.on('completed', job => {
    emailJobs.inc({ outcome: 'completed' });
    logger.info('Mailer job completed', { jobId: job.id, eventId: job.data.eventId, bookingId: job.data.bookingId, correlationId: job.data.correlationId });
  });
  workerInstance.on('failed', (job, error) => {
    emailJobs.inc({ outcome: 'failed' });
    logger.error('Mailer job failed', { jobId: job?.id, eventId: job?.data.eventId, bookingId: job?.data.bookingId,
      correlationId: job?.data.correlationId, attempts: job?.attemptsMade, error: error.message });
    if (!job) return;
    if (job.attemptsMade < (job.opts.attempts || 1)) { emailJobs.inc({ outcome: 'retried' }); return; }
    // The original failed job is also retained if Redis fails during DLQ copying.
    void preserveFailedJob(job, error.message).then(() => emailJobs.inc({ outcome: 'dlq' }))
      .catch(err => logger.error('DLQ copy failed; original failed job retained', { jobId: job.id, error: err.message }));
  });
  workerInstance.on('error', error => logger.error('Mailer worker error', { error: error.message }));
  return workerInstance;
}
