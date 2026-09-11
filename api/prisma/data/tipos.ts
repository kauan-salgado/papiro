/**
 * Formato de importacao em lote de um edital: uma linha por item, exatamente
 * como ele aparece no edital verticalizado.
 */
export type ItemEdital = {
  readonly disciplina: string;
  readonly codigoEdital: string;
  readonly descricao: string;
};

export type EditalSeed = {
  readonly concurso: {
    readonly nome: string;
    readonly banca: string;
    /** ISO 8601 (YYYY-MM-DD) ou null quando a data ainda nao saiu. */
    readonly dataProva: string | null;
  };
  readonly cargo: { readonly nome: string };
  /** Peso de cada disciplina na prova. Ausente = peso 1. */
  readonly pesos?: Readonly<Record<string, number>>;
  readonly itens: readonly ItemEdital[];
};
