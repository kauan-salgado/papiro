import { prisma } from '../../lib/prisma.js';

/**
 * A conta de demonstracao — dona dos editais de exemplo que o visitante ve.
 *
 * O `github_id` sintetico 'demonstracao' nunca colide com um id do GitHub, que
 * e sempre numerico: ninguem consegue entrar de verdade nesta conta.
 */
const GITHUB_ID_DA_DEMONSTRACAO = 'demonstracao';

/** Memoriza o id entre requisicoes: a conta nao muda, e a vitrine e caminho quente. */
let idMemorizado: number | null = null;

export async function idDaContaDeDemonstracao(): Promise<number | null> {
  if (idMemorizado !== null) {
    return idMemorizado;
  }

  const conta = await prisma.usuario.findUnique({
    where: { githubId: GITHUB_ID_DA_DEMONSTRACAO },
    select: { id: true },
  });

  idMemorizado = conta?.id ?? null;

  return idMemorizado;
}

/** Usado pelos testes, que criam e destroem a conta a cada arquivo. */
export function esquecerContaDeDemonstracao(): void {
  idMemorizado = null;
}
