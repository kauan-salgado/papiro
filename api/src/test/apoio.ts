import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../lib/prisma.js';
import { NOME_DO_COOKIE } from '../modules/auth/auth.service.js';

/**
 * Cria um usuario e uma sessao valida direto no banco.
 *
 * O fluxo do GitHub nao roda no teste — depender da rede de terceiros para
 * verificar autorizacao seria trocar um teste determinístico por um flaky. O
 * que importa aqui e o que vem DEPOIS do login: quem enxerga o que.
 */
export async function criarUsuarioDeTeste(apelido: string) {
  const usuario = await prisma.usuario.create({
    data: {
      githubId: `__teste__${apelido}-${randomBytes(6).toString('hex')}`,
      login: `teste-${apelido}`,
      nome: `Usuário ${apelido}`,
    },
  });

  const token = randomBytes(32).toString('hex');

  await prisma.sessaoAuth.create({
    data: {
      token,
      usuarioId: usuario.id,
      expiraEm: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { usuario, cookie: `${NOME_DO_COOKIE}=${token}` };
}

/** Apaga o usuario e, em cascata, tudo que ele criou. */
export async function removerUsuarioDeTeste(id: number): Promise<void> {
  await prisma.usuario.delete({ where: { id } }).catch(() => undefined);
}

/** Cliente HTTP que carrega o cookie de sessao em toda requisicao. */
export function como(app: Express, cookie: string) {
  return {
    get: (url: string) => request(app).get(url).set('Cookie', cookie),
    post: (url: string) => request(app).post(url).set('Cookie', cookie),
    patch: (url: string) => request(app).patch(url).set('Cookie', cookie),
    delete: (url: string) => request(app).delete(url).set('Cookie', cookie),
  };
}
