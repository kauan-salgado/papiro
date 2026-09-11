/** Envelope unico de resposta da API. Sucesso e erro tem o mesmo formato. */
export type Envelope<T> = {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly detalhes?: unknown;
};

export function sucesso<T>(data: T): Envelope<T> {
  return { success: true, data, error: null };
}

export function falha(error: string, detalhes?: unknown): Envelope<never> {
  return detalhes === undefined
    ? { success: false, data: null, error }
    : { success: false, data: null, error, detalhes };
}
