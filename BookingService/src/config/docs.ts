import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
export function mountDocs(app: Express) {
  const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/openapi.json'), 'utf8'));
  const ports: Record<string, number> = { AuthService: 3000, HotelService: 3001, BookingService: 3002, NotificationService: 3003 };
  const port = ports[process.env.SERVICE_NAME || path.basename(path.resolve(__dirname, '../..'))];
  // Each service's Swagger uses its own origin; trying an endpoint needs no CORS workaround.
  for (const [route, item] of Object.entries(spec.paths) as [string, Record<string, any>][]) {
    let hasOperation = false;
    for (const [method, operation] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      if (!operation.servers?.some((server: { url: string }) => server.url.endsWith(':' + port))) { delete item[method]; continue; }
      operation.servers = [{ url: '/' }];
      hasOperation = true;
    }
    if (!hasOperation) delete spec.paths[route];
  }
  spec.servers = [{ url: '/' }];
  app.get('/openapi.json', (_req, res) => { res.json(spec); });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
