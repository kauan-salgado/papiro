import type { NextFunction, Request, Response } from 'express';
import { falha } from '../http/envelope.js';
import { NOME_DO_COOKIE, usuarioDaSessao } from '../modules/auth/auth.service.js';

/**
 * Identifica quem esta pedindo, sem barrar ninguem. Roda antes de todas as
 * rotas para que `req.usuario` esteja disponivel; quem decide se a rota exige
 * login e o `exigirLogin`.
 */
export async function carregarUsuario(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = (req.cookies as Record<string, string> | undefined)?.[NOME_DO_COOKIE];

  if (token) {
    req.usuario = (await usuarioDaSessao(token)) ?? undefined;
  }

  next();
}

/**
 * Barra quem nao esta autenticado.
 *
 * 401 e nao 403 de proposito: a diferenca importa para o front, que redireciona
 * para o login no primeiro caso e mostra "voce nao pode fazer isso" no segundo.
 */
export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json(falha('Entre com o GitHub para continuar.'));
    return;
  }

  next();
}

/**
 * Id do usuario autenticado. Lanca se chamada fora de rota protegida — o que
 * seria um erro de programacao, nao uma condicao de execucao: significaria uma
 * consulta prestes a rodar sem filtro de dono.
 */
export function idDoUsuario(req: Request): number {
  if (!req.usuario) {
    throw new Error('Rota consultou o usuario sem estar atras de exigirLogin.');
  }

  return req.usuario.id;
}
