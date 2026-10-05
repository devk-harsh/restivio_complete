import app from './app';
import { serverConfig } from './config';
import sequelize from './db/models/sequelize';
import { redisClient } from './config/redis.config';
import logger from './config/logger.config';
import { jwtSecret } from './middlewares/auth.middleware';
import { dispatchOutboxBatch } from './services/outbox.service';
import { recoverPendingBookings } from './services/booking.service';
async function start() {
  jwtSecret();
  if (!process.env.INTERNAL_SERVICE_KEY) throw new Error('INTERNAL_SERVICE_KEY is required');
  await sequelize.authenticate(); await redisClient.ping();
  let stopping = false;
  let running = Promise.resolve();
  const tick = () => {
    running = (async () => {
      try { await dispatchOutboxBatch(); await recoverPendingBookings(); }
      catch (error) { logger.error('Background work will retry', { error: error instanceof Error ? error.message : 'Unknown error' }); }
    })().finally(() => { if (!stopping) timer = setTimeout(tick, 1000); });
  };
  let timer = setTimeout(tick, 1000);
  const server = app.listen(serverConfig.PORT, () => logger.info('BookingService listening', { port: serverConfig.PORT }));
  const shutdown = () => {
    stopping = true; clearTimeout(timer);
    server.close(() => { void running.then(async () => { await redisClient.quit(); await sequelize.close(); process.exit(0); }); });
  };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { logger.error('Startup failed', { error: error.message }); process.exit(1); });
