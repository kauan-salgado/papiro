import { TipoEstudo } from '../../src/generated/prisma/enums.js';

export type SessaoDemo = {
  readonly topicoId: number;
  readonly data: Date;
  readonly tempoMinutos: number;
  readonly tipoEstudo: TipoEstudo;
  readonly questoesAcertadas: number | null;
  readonly questoesErradas: number | null;
  readonly questoesBrancas: number | null;
  readonly observacoes: string | null;
  /** Marca as sessoes que devem ser agrupadas sob o simulado do cargo. */
  readonly noSimulado: boolean;
};

const DIAS_DE_HISTORICO = 60;
const SESSOES_POR_TOPICO_MAX = 3;
const TOPICOS_NO_SIMULADO = 5;

/**
 * Gerador congruente linear. Semente fixa de proposito: o dashboard de
 * demonstracao precisa sair igual em toda maquina, senao o print do portfolio
 * muda a cada `npm run seed`.
 */
function criarSorteio(semente: number) {
  let estado = semente;

  return function proximo(limiteExclusivo: number): number {
    estado = (estado * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return Math.floor((estado / 4_294_967_296) * limiteExclusivo);
  };
}

function subtrairDias(referencia: Date, dias: number): Date {
  const data = new Date(referencia);
  data.setDate(data.getDate() - dias);
  return data;
}

/**
 * Monta um historico de estudo plausivel para os topicos informados.
 * Nenhuma sessao viola o CHECK do banco: contadores de questoes existem
 * somente quando o tipo e Questoes.
 */
export function gerarSessoesDemo(
  topicoIds: readonly number[],
  semente: number,
  hoje: Date = new Date(),
): readonly SessaoDemo[] {
  const sortear = criarSorteio(semente);
  const tipos: readonly TipoEstudo[] = [
    TipoEstudo.Teoria,
    TipoEstudo.Revisao,
    TipoEstudo.Resumo,
    TipoEstudo.Questoes,
    TipoEstudo.Questoes,
  ];

  const idsDoSimulado = new Set(topicoIds.slice(0, TOPICOS_NO_SIMULADO));

  return topicoIds.flatMap((topicoId) => {
    const quantidade = sortear(SESSOES_POR_TOPICO_MAX + 1);

    return Array.from({ length: quantidade }, (_, indice): SessaoDemo => {
      const tipoEstudo = tipos[sortear(tipos.length)] ?? TipoEstudo.Teoria;
      const ehQuestoes = tipoEstudo === TipoEstudo.Questoes;

      const acertadas = ehQuestoes ? 4 + sortear(17) : null;
      const erradas = ehQuestoes ? sortear(9) : null;
      const brancas = ehQuestoes ? sortear(4) : null;

      return {
        topicoId,
        data: subtrairDias(hoje, sortear(DIAS_DE_HISTORICO)),
        tempoMinutos: 20 + sortear(8) * 15,
        tipoEstudo,
        questoesAcertadas: acertadas,
        questoesErradas: erradas,
        questoesBrancas: brancas,
        observacoes: null,
        noSimulado: ehQuestoes && indice === 0 && idsDoSimulado.has(topicoId),
      };
    });
  });
}
