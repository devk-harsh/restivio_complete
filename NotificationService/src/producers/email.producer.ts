import { mailerQueue, EMAIL_JOB_NAME } from '../queues/mailer.queue';
import { EmailJobPayload } from '../types/email.types';
import { emailJobs } from '../config/metrics';
export async function addEmailToQueue(payload: EmailJobPayload) {
  const job = await mailerQueue.add(EMAIL_JOB_NAME, payload, {
    ...(payload.eventId ? { jobId: payload.eventId } : {}),
    attempts: 3,
    backoff: { type: 'exponential', delay: Number(process.env.EMAIL_RETRY_DELAY_MS) || 1000, jitter: 0.2 },
    // Keep completed IDs: outbox retries must not enqueue a second logical job.
    removeOnComplete: false,
    removeOnFail: false,
  });
  emailJobs.inc({ outcome: 'accepted' });
  return job;
}
