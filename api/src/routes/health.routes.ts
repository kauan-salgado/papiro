import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRoutes = Router();

/**
 * Sonda de infraestrutura. Nao basta a API responder: ela precisa alcancar o
 * banco. Por isso o SELECT 1 — sem ele, "ok" significaria apenas "o Node subiu".
 */
healthRoutes.get('/health', async (_req, res) => {
  const inicio = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'papiro-api',
        banco: {
          conectado: true,
          latenciaMs: Math.round(performance.now() - inicio),
        },
        uptimeSegundos: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (erro) {
    console.error('[api] health: banco inacessivel:', erro);

    res.status(503).json({
      success: false,
      data: { status: 'degradado', service: 'papiro-api', banco: { conectado: false } },
      error: 'Banco de dados inacessivel.',
    });
  }
});
