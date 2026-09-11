import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../env.js';
import { sucesso } from '../../http/envelope.js';
import { AppError } from '../../http/erros.js';
import { buscarPerfilPeloCodigo, urlDeAutorizacao } from '../../lib/github-oauth.js';
import { encerrarSessao, entrarComGitHub, NOME_DO_COOKIE } from './auth.service.js';

export const authRoutes = Router();

const COOKIE_ESTADO = 'papiro_oauth_state';
const MINUTOS_PARA_CONCLUIR_LOGIN = 10;

const ehProducao = env.NODE_ENV === 'production';

/** O callback precisa bater com o cadastrado no OAuth App, caractere a caractere. */
function urlDeCallback(): string {
  return `${env.WEB_ORIGIN}/api/auth/github/callback`;
}

function exigirCredenciais() {
  const { GITHUB_CLIENT_ID: id, GITHUB_CLIENT_SECRET: segredo } = env;

  if (!id || !segredo) {
    throw new AppError(
      'Login indisponivel: o servidor nao tem as credenciais do GitHub configuradas.',
      503,
    );
  }

  return { id, segredo };
}

/**
 * Comeco do fluxo. O `state` e sorteado aqui e guardado em cookie proprio: e o
 * que impede um terceiro de forjar um retorno de login (CSRF no OAuth).
 */
authRoutes.get('/auth/github', (_req, res) => {
  const { id } = exigirCredenciais();
  const state = randomBytes(16).toString('hex');

  res.cookie(COOKIE_ESTADO, state, {
    httpOnly: true,
    secure: ehProducao,
    sameSite: 'lax',
    maxAge: MINUTOS_PARA_CONCLUIR_LOGIN * 60 * 1000,
    path: '/',
  });

  res.redirect(urlDeAutorizacao({ clientId: id, redirectUri: urlDeCallback(), state }));
});

/** Volta do GitHub: valida o state, troca o codigo pelo perfil e abre a sessao. */
authRoutes.get('/auth/github/callback', async (req, res) => {
  const { id, segredo } = exigirCredenciais();
  const { code, state } = req.query as { code?: string; state?: string };
  const estadoEsperado = (req.cookies as Record<string, string> | undefined)?.[COOKIE_ESTADO];

  res.clearCookie(COOKIE_ESTADO, { path: '/' });

  if (!code || !state || !estadoEsperado || state !== estadoEsperado) {
    res.redirect(`${env.WEB_ORIGIN}/entrar?erro=estado`);
    return;
  }

  try {
    const perfil = await buscarPerfilPeloCodigo({
      clientId: id,
      clientSecret: segredo,
      code,
      redirectUri: urlDeCallback(),
    });

    const { token, expiraEm } = await entrarComGitHub(perfil);

    res.cookie(NOME_DO_COOKIE, token, {
      httpOnly: true,
      secure: ehProducao,
      sameSite: 'lax',
      expires: expiraEm,
      path: '/',
    });

    res.redirect(env.WEB_ORIGIN);
  } catch (erro) {
    console.error('[auth] falha no retorno do GitHub:', erro);
    res.redirect(`${env.WEB_ORIGIN}/entrar?erro=github`);
  }
});

/**
 * Quem sou eu. Responde 200 com null quando nao ha ninguem — nao e erro.
 *
 * Visitante da vitrine tambem responde null: ele nao esta logado, e o front
 * precisa saber disso para oferecer o login em vez de tratar como conta.
 */
authRoutes.get('/auth/eu', (req, res) => {
  res.json(sucesso(req.visitante ? null : (req.usuario ?? null)));
});

authRoutes.post('/auth/sair', async (req, res) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[NOME_DO_COOKIE];

  if (token) {
    await encerrarSessao(token);
  }

  res.clearCookie(NOME_DO_COOKIE, { path: '/' });
  res.status(204).send();
});
