import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'papiro-api',
      uptimeSegundos: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});
