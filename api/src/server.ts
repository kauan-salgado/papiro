import { createApp } from './app.js';
import { env } from './env.js';

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`[api] Papiro rodando em http://localhost:${env.API_PORT}/api/health`);
  console.log(`[api] ambiente: ${env.NODE_ENV}`);
});
