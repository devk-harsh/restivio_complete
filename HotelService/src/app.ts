import './config';
import express from 'express';
import v1Router from './routers/v1/index.router';
import v2Router from './routers/v2/index.router';
import { appErrorHandler, genericErrorHandler } from './middlewares/error.middleware';
import { attachCorrelationIdMiddleware } from './middlewares/correlation.middleware';
import { httpMetrics, operationalRoutes } from './middlewares/observability.middleware';
import { mountDocs } from './config/docs';
import sequelize from './db/models/sequelize';
import './db/models/associations';

const app = express();
app.use(attachCorrelationIdMiddleware, httpMetrics, express.json({ limit: '64kb' }));
operationalRoutes(app, { database: () => sequelize.authenticate(),  });
mountDocs(app);
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
app.use(appErrorHandler, genericErrorHandler);
export default app;
