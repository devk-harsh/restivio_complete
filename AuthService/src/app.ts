import './config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { attachCorrelationIdMiddleware } from './middlewares/correlation.middleware';
import { httpMetrics, operationalRoutes } from './middlewares/observability.middleware';
import authRouter from './routers/auth.router';
import sequelize from './db/models/sequelize';
import logger from './config/logger.config';
import { mountDocs } from './config/docs';

const app = express();
import { browserCors } from './middlewares/cors.middleware';
app.use(browserCors);
app.use(attachCorrelationIdMiddleware, httpMetrics, express.json({ limit: '32kb' }), cookieParser());
operationalRoutes(app, { database: () => sequelize.authenticate() });
mountDocs(app);
app.use('/api/v1/auth', authRouter);
app.use((error: Error & { statusCode?: number; status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error instanceof ZodError ? 400 : error.statusCode || error.status || 500;
  if (status >= 500) logger.error('Request failed', { error: error.message });
  res.status(status).json({ success: false, message: status >= 500 ? 'Internal Server Error' : error instanceof ZodError ? 'Invalid request body' : error.message });
});
export default app;
