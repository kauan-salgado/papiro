import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';
import { healthRoutes } from './routes/health.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json());

  app.use('/api', healthRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
