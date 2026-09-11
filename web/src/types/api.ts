/** Nomes como o Prisma Client os expoe (sem acento); o banco guarda 'Revisão'/'Questões'. */
export type TipoEstudo = 'Teoria' | 'Revisao' | 'Resumo' | 'Questoes';

export const TIPOS_DE_ESTUDO: readonly TipoEstudo[] = ['Teoria', 'Revisao', 'Resumo', 'Questoes'];

export const ROTULO_TIPO_ESTUDO: Readonly<Record<TipoEstudo, string>> = {
  Teoria: 'Teoria',
  Revisao: 'Revisão',
  Resumo: 'Resumo',
  Questoes: 'Questões',
};

export type Concurso = {
  readonly id: number;
  readonly nome: string;
  readonly banca: string | null;
  readonly dataProva: string | null;
};

export type Cargo = {
  readonly id: number;
  readonly concursoId: number;
  readonly nome: string;
  readonly concurso: Pick<Concurso, 'id' | 'nome' | 'banca'>;
  readonly _count: { readonly disciplinas: number; readonly simulados: number };
  /** Usado pela confirmação de exclusão: o que se perde ao apagar. */
  readonly totais: { readonly topicos: number; readonly sessoes: number };
};

export type DesempenhoTopico = {
  readonly topicoId: number;
  readonly codigoEdital: string | null;
  readonly topico: string;
  readonly ordem: number | null;
  readonly disciplinaId: number;
  readonly disciplina: string;
  readonly totalSessoes: number;
  readonly totalMinutos: number;
  readonly acertos: number;
  readonly erros: number;
  readonly brancos: number;
  readonly ultimoEstudo: string | null;
  readonly percentualAcerto: number | null;
};

export type DesempenhoDisciplina = {
  readonly disciplinaId: number;
  readonly disciplina: string;
  readonly peso: number | null;
  readonly cargoId: number;
  readonly cargo: string;
  readonly concursoId: number;
  readonly concurso: string;
  readonly totalSessoes: number;
  readonly totalMinutos: number;
  readonly acertos: number;
  readonly erros: number;
  readonly brancos: number;
  readonly percentualAcerto: number | null;
};

export type DisciplinaDoEdital = DesempenhoDisciplina & {
  readonly topicos: readonly DesempenhoTopico[];
};

export type Edital = {
  readonly cargo: { readonly id: number; readonly nome: string };
  readonly concurso: Concurso;
  readonly disciplinas: readonly DisciplinaDoEdital[];
};

export type Sessao = {
  readonly id: number;
  readonly topicoId: number;
  readonly simuladoId: number | null;
  readonly data: string;
  readonly tempoMinutos: number;
  readonly tipoEstudo: TipoEstudo;
  readonly questoesAcertadas: number | null;
  readonly questoesErradas: number | null;
  readonly questoesBrancas: number | null;
  readonly observacoes: string | null;
  readonly simulado: { readonly id: number; readonly nome: string } | null;
};

export type Simulado = {
  readonly id: number;
  readonly cargoId: number;
  readonly nome: string;
  readonly data: string;
  readonly _count: { readonly sessoes: number };
};
