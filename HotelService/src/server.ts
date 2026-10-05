import app from './app';
import { serverConfig } from './config';
import sequelize from './db/models/sequelize';
import logger from './config/logger.config';
import { jwtSecret } from './middlewares/auth.middleware';
async function start() {
  jwtSecret();
  if (!process.env.INTERNAL_SERVICE_KEY) throw new Error('INTERNAL_SERVICE_KEY is required');
  await sequelize.authenticate();
  const server = app.listen(serverConfig.PORT, () => logger.info('HotelService listening', { port: serverConfig.PORT }));
  const shutdown = () => server.close(() => { void sequelize.close().then(() => process.exit(0)); });
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { logger.error('Startup failed', { error: error.message }); process.exit(1); });
