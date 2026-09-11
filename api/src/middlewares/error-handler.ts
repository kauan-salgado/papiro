import type { NextFunction, Request, Response } from 'express';
import { env } from '../env.js';

/**
 * Handler de erro terminal da API.
 * Formato de resposta segue o envelope { success, data, error } usado em todas as rotas.
 * Detalhe tecnico so vaza fora de producao.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[api] erro nao tratado:', err);

  const isProd = env.NODE_ENV === 'production';
  const message =
    !isProd && err instanceof Error ? err.message : 'Erro interno no servidor.';

  res.status(500).json({ success: false, data: null, error: message });
}
