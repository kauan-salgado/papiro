import { z } from 'zod';

/**
 * Conversa com o GitHub. Isolada aqui para o resto do projeto nao precisar
 * saber que a identidade vem de la — e para o teste poder substituir a troca
 * de codigo por uma funcao falsa.
 */

const AUTORIZACAO = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const USUARIO = 'https://api.github.com/user';

/** Apenas dados publicos do perfil: nenhum acesso a repositorio e pedido. */
const ESCOPO = 'read:user';

const respostaTokenSchema = z.object({ access_token: z.string().min(1) });

const perfilSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  login: z.string(),
  name: z.string().nullish(),
  avatar_url: z.string().nullish(),
});

export type PerfilGitHub = z.infer<typeof perfilSchema>;

export function urlDeAutorizacao(opcoes: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const parametros = new URLSearchParams({
    client_id: opcoes.clientId,
    redirect_uri: opcoes.redirectUri,
    scope: ESCOPO,
    state: opcoes.state,
  });

  return `${AUTORIZACAO}?${parametros.toString()}`;
}

/**
 * Troca o codigo de uso unico pelo perfil. Duas requisicoes: o token de acesso
 * e, com ele, o perfil. O token nao e guardado — ele so serve para descobrir
 * quem e a pessoa; a sessao daqui em diante e nossa.
 */
export async function buscarPerfilPeloCodigo(opcoes: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<PerfilGitHub> {
  const respostaToken = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: opcoes.clientId,
      client_secret: opcoes.clientSecret,
      code: opcoes.code,
      redirect_uri: opcoes.redirectUri,
    }),
  });

  if (!respostaToken.ok) {
    throw new Error(`GitHub recusou a troca do codigo (${respostaToken.status}).`);
  }

  const { access_token } = respostaTokenSchema.parse(await respostaToken.json());

  const respostaPerfil = await fetch(USUARIO, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'papiro',
    },
  });

  if (!respostaPerfil.ok) {
    throw new Error(`GitHub recusou a leitura do perfil (${respostaPerfil.status}).`);
  }

  return perfilSchema.parse(await respostaPerfil.json());
}
