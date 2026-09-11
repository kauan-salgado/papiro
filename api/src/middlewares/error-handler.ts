import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../env.js';
import { falha } from '../http/envelope.js';
import { AppError } from '../http/erros.js';
import { traduzirErroDePersistencia } from '../http/prisma-erros.js';

/**
 * Handler terminal. Ordem de tratamento:
 *   1. ZodError            -> 400 com a lista de campos invalidos
 *   2. AppError            -> status declarado pelo proprio erro
 *   3. erro do banco       -> traduzido (23514 vira 400, nao 500)
 *   4. qualquer outra coisa-> 500 generico, com detalhe apenas fora de producao
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof z.ZodError) {
    // flattenError entrega { formErrors, fieldErrors } — o formato que o
    // formulario do front consegue ligar direto em cada campo.
    res.status(400).json(falha('Dados invalidos.', z.flattenError(err)));
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json(falha(err.message, err.detalhes));
    return;
  }

  const traduzido = traduzirErroDePersistencia(err);

  if (traduzido) {
    console.warn(`[api] erro de persistencia tratado: ${traduzido.message}`);
    res.status(traduzido.status).json(falha(traduzido.message, traduzido.detalhes));
    return;
  }

  console.error('[api] erro nao tratado:', err);

  const message =
    env.NODE_ENV !== 'production' && err instanceof Error
      ? err.message
      : 'Erro interno no servidor.';

  res.status(500).json(falha(message));
}
