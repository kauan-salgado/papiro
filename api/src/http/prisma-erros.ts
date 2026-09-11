import { AppError, ConflitoError, NaoEncontradoError, RequisicaoInvalidaError } from './erros.js';

/**
 * Traducao dos erros do banco para erros de aplicacao.
 *
 * O ponto importante e o 23514 (check_violation): o CHECK do Postgres nao e um
 * bug a ser logado como 500 — e a ultima linha de validacao, e o cliente
 * precisa receber 400 com uma mensagem que explique a regra. Em condicao normal
 * o Zod barra antes; se chegou aqui, alguem contornou o formulario ou a
 * validacao da aplicacao ficou dessincronizada da do banco.
 *
 * Prisma 7 embrulha o erro do driver: PrismaClientKnownRequestError com code
 * P2039 e meta.driverAdapterError.cause.code = '23514'.
 */

const MENSAGENS_POR_CONSTRAINT: Readonly<Record<string, string>> = {
  chk_questoes_obrigatorias:
    'Sessao do tipo "Questoes" exige acertadas, erradas e brancas; os demais tipos nao aceitam esses campos.',
  chk_tempo_minutos_positivo: 'O tempo de estudo precisa ser maior que zero.',
  chk_questoes_nao_negativas: 'Os contadores de questoes nao podem ser negativos.',
};

type CausaDriver = {
  readonly code?: string;
  readonly message?: string;
  readonly constraint?: { readonly index?: string };
};

function extrairCausaDriver(erro: unknown): CausaDriver | null {
  if (typeof erro !== 'object' || erro === null || !('meta' in erro)) {
    return null;
  }

  const meta = (erro as { meta?: { driverAdapterError?: { cause?: CausaDriver } } }).meta;
  return meta?.driverAdapterError?.cause ?? null;
}

function nomeDaConstraint(causa: CausaDriver): string | null {
  if (causa.constraint?.index) {
    return causa.constraint.index;
  }

  const encontrado = /constraint "([^"]+)"/.exec(causa.message ?? '');
  return encontrado?.[1] ?? null;
}

function codigoPrisma(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('code' in erro)) {
    return null;
  }

  const code = (erro as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Devolve um AppError quando reconhece o erro do banco, ou null para deixar o
 * handler terminal tratar como 500.
 */
export function traduzirErroDePersistencia(erro: unknown): AppError | null {
  const causa = extrairCausaDriver(erro);
  const constraint = causa ? nomeDaConstraint(causa) : null;

  // 23514 — check_violation
  if (causa?.code === '23514') {
    const mensagem = constraint ? MENSAGENS_POR_CONSTRAINT[constraint] : undefined;

    return new RequisicaoInvalidaError(
      mensagem ?? 'O registro viola uma regra de integridade do banco de dados.',
      { constraint, codigoPostgres: '23514' },
    );
  }

  switch (codigoPrisma(erro)) {
    case 'P2025':
      return new NaoEncontradoError('Registro', 'informado');
    case 'P2002':
      return new ConflitoError(
        constraint?.includes('codigo_edital')
          ? 'Ja existe um topico com esse codigo de edital nesta disciplina.'
          : 'Ja existe um registro com esses dados.',
      );
    case 'P2003':
      return new RequisicaoInvalidaError(
        'Referencia invalida: o registro relacionado nao existe.',
        { constraint },
      );
    default:
      return null;
  }
}
