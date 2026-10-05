import app from './app';
import { serverConfig } from './config';
import sequelize from './db/models/sequelize';
import { jwtSecret } from './middlewares/auth.middleware';
import logger from './config/logger.config';

async function start() {
  jwtSecret();
  await sequelize.authenticate();
  const server = app.listen(serverConfig.PORT, () => logger.info('AuthService listening', { port: serverConfig.PORT }));
  const shutdown = () => server.close(() => { void sequelize.close().then(() => process.exit(0)); });
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { logger.error('Startup failed', { error: error.message }); process.exit(1); });
