import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import type { PerfilGitHub } from '../../lib/github-oauth.js';

/** Trinta dias: longo o bastante para nao irritar, curto o bastante para expirar. */
const DIAS_DE_SESSAO = 30;

export const NOME_DO_COOKIE = 'papiro_sessao';

export type UsuarioAutenticado = {
  readonly id: number;
  readonly login: string;
  readonly nome: string | null;
  readonly avatarUrl: string | null;
};

/**
 * Token opaco de 32 bytes. Nao e JWT de proposito: o servidor precisa poder
 * invalidar uma sessao — "sair" que nao invalida nada nao e sair.
 */
function sortearToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Entra pelo GitHub. O usuario e identificado pelo id numerico, nao pelo
 * login: login se troca, id nao. Se o perfil mudou de nome ou de foto desde a
 * ultima visita, os dados sao atualizados na passagem.
 */
export async function entrarComGitHub(perfil: PerfilGitHub) {
  const usuario = await prisma.usuario.upsert({
    where: { githubId: perfil.id },
    create: {
      githubId: perfil.id,
      login: perfil.login,
      nome: perfil.name ?? null,
      avatarUrl: perfil.avatar_url ?? null,
    },
    update: {
      login: perfil.login,
      nome: perfil.name ?? null,
      avatarUrl: perfil.avatar_url ?? null,
    },
  });

  const expiraEm = new Date(Date.now() + DIAS_DE_SESSAO * 24 * 60 * 60 * 1000);
  const { token } = await prisma.sessaoAuth.create({
    data: { token: sortearToken(), usuarioId: usuario.id, expiraEm },
    select: { token: true },
  });

  return { token, expiraEm, usuario };
}

/** Devolve o dono da sessao, ou null se o token nao existe ou venceu. */
export async function usuarioDaSessao(token: string): Promise<UsuarioAutenticado | null> {
  const sessao = await prisma.sessaoAuth.findUnique({
    where: { token },
    select: {
      expiraEm: true,
      usuario: { select: { id: true, login: true, nome: true, avatarUrl: true } },
    },
  });

  if (!sessao) {
    return null;
  }

  if (sessao.expiraEm.getTime() < Date.now()) {
    // Sessao vencida some na primeira tentativa de uso: a tabela se limpa
    // sozinha no caminho normal, sem precisar de rotina agendada.
    await prisma.sessaoAuth.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  return sessao.usuario;
}

export async function encerrarSessao(token: string): Promise<void> {
  await prisma.sessaoAuth.delete({ where: { token } }).catch(() => undefined);
}
