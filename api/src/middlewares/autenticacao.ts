import type { NextFunction, Request, Response } from 'express';
import { env } from '../env.js';
import { falha } from '../http/envelope.js';
import { NOME_DO_COOKIE, usuarioDaSessao } from '../modules/auth/auth.service.js';
import { idDaContaDeDemonstracao } from '../modules/auth/vitrine.service.js';

/**
 * Identifica quem esta pedindo, sem barrar ninguem. Roda antes de todas as
 * rotas para que `req.usuario` esteja disponivel; quem decide se a rota exige
 * login e o `exigirLogin`.
 */
export function carregarUsuario(vitrinePublica = env.VITRINE_PUBLICA) {
  return async function identificar(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
  const token = (req.cookies as Record<string, string> | undefined)?.[NOME_DO_COOKIE];

  if (token) {
    req.usuario = (await usuarioDaSessao(token)) ?? undefined;
  }

  // Visitante entra na vitrine: recebe a identidade da conta de demonstracao,
  // e nada mais. Os mesmos filtros de posse que protegem uma conta de outra
  // passam a valer aqui — o visitante nao alcanca dado de ninguem, so o do
  // catalogo de exemplo. E `visitante` marca que essa identidade e emprestada.
  if (!req.usuario && vitrinePublica) {
    const idDaDemonstracao = await idDaContaDeDemonstracao();

    if (idDaDemonstracao !== null) {
      req.usuario = {
        id: idDaDemonstracao,
        login: 'visitante',
        nome: 'Visitante',
        avatarUrl: null,
      };
      req.visitante = true;
    }
  }

  next();
  };
}

/**
 * Identidade emprestada nao escreve.
 *
 * Sem isto, a vitrine viraria um mural editavel por qualquer um — e pior, com
 * a aparencia de conta propria. O visitante le a demonstracao; para registrar
 * o proprio estudo, entra.
 */
export function bloquearEscritaDeVisitante(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.visitante && req.method !== 'GET') {
    res
      .status(401)
      .json(falha('Entre com o GitHub para registrar seu estudo — esta é uma demonstração.'));
    return;
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
