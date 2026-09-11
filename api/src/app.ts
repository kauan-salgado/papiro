import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';
import { criarRotas } from './routes.js';

/**
 * O Express 5 encaminha rejeicoes de handlers async direto para o handler de
 * erro, entao as rotas nao precisam de try/catch nem de wrapper: basta lancar.
 */
export function createApp({ modoDemo }: { modoDemo?: boolean } = {}) {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', criarRotas({ modoDemo }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
