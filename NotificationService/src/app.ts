import './config';
import express from 'express';
import v1Router from './routers/V1/index.router';
import v2Router from './routers/V2/index.router';
import { appErrorHandler, genericErrorHandler } from './middlewares/error.middleware';
import { attachCorrelationIdMiddleware } from './middlewares/correlation.middleware';
import { httpMetrics, operationalRoutes } from './middlewares/observability.middleware';
import { mountDocs } from './config/docs';

import { redisConnection } from './config/redis.config';
const app = express();
app.use(attachCorrelationIdMiddleware, httpMetrics, express.json({ limit: '64kb' }));
operationalRoutes(app, {  redis: () => redisConnection.ping() });
mountDocs(app);
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
app.use(appErrorHandler, genericErrorHandler);
export default app;
