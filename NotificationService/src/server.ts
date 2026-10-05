import app from './app';
import { serverConfig } from './config';
import logger from './config/logger.config';
import { setupMailerWorker, deadLetterQueue, refreshQueueMetrics } from './processors/email.processor';
import { mailerQueue } from './queues/mailer.queue';
import { redisConnection } from './config/redis.config';
async function start() {
  if (!process.env.INTERNAL_SERVICE_KEY) throw new Error('INTERNAL_SERVICE_KEY is required');
  await redisConnection.ping();
  const worker = setupMailerWorker();
  const timer = setInterval(() => { void refreshQueueMetrics().catch(error => logger.warn('Queue metrics unavailable', { error: error.message })); }, 5000);
  const server = app.listen(serverConfig.PORT, () => logger.info('NotificationService listening', { port: serverConfig.PORT }));
  const shutdown = () => {
    clearInterval(timer);
    server.close(() => { void (async () => {
      await worker.close(); await mailerQueue.close(); await deadLetterQueue.close(); await redisConnection.quit(); process.exit(0);
    })(); });
  };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { logger.error('Startup failed', { error: error.message }); process.exit(1); });
