import { Express, RequestHandler } from 'express';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ service: process.env.SERVICE_NAME || 'NotificationService' });
collectDefaultMetrics({ register: registry });
const requests = new Counter({ name: 'restivio_http_requests_total', help: 'Completed HTTP requests', labelNames: ['method', 'route', 'status'], registers: [registry] });
const errors = new Counter({ name: 'restivio_http_errors_total', help: 'HTTP 4xx and 5xx responses', labelNames: ['method', 'route', 'status'], registers: [registry] });
const duration = new Histogram({ name: 'restivio_http_duration_seconds', help: 'HTTP response duration', labelNames: ['method', 'route'], buckets: [.01, .05, .1, .25, .5, 1, 2, 5, 10], registers: [registry] });

export const httpMetrics: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    // Route templates contain :id; never use req.originalUrl or raw identifiers.
    const route = req.route?.path ? String(req.route.path) : 'unmatched';
    if (route === '/metrics') return;
    const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER';
    const labels = { method, route, status: String(res.statusCode) };
    requests.inc(labels);
    if (res.statusCode >= 400) errors.inc(labels);
    duration.observe({ method, route }, Number(process.hrtime.bigint() - start) / 1e9);
  });
  next();
};

export function operationalRoutes(app: Express, checks: Record<string, () => Promise<unknown>>) {
  app.get('/health/live', (_req, res) => { res.json({ status: 'alive' }); });
  app.get('/health/ready', async (_req, res) => {
    const dependencies: Record<string, string> = {};
    await Promise.all(Object.entries(checks).map(async ([name, check]) => {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([check(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 2000); })]);
        dependencies[name] = 'up';
      } catch { dependencies[name] = 'down'; }
      finally { if (timer) clearTimeout(timer); }
    }));
    const ready = Object.values(dependencies).every(status => status === 'up');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', dependencies });
  });
  app.get('/metrics', async (_req, res) => { res.type(registry.contentType).send(await registry.metrics()); });
}
