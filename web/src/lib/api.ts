type Envelope<T> = {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly detalhes?: { readonly fieldErrors?: Record<string, string[]> };
};

/**
 * Erro de API com os erros por campo preservados. E isso que permite o
 * formulario destacar o campo certo quando o backend recusa — inclusive quando
 * quem recusou foi o CHECK constraint do Postgres, e nao o Zod do front.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Readonly<Record<string, string[]>> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo: Envelope<T> = await resposta.json().catch(() => ({
    success: false,
    data: null,
    error: 'Resposta ilegivel do servidor.',
  }));

  if (!resposta.ok || !corpo.success) {
    throw new ApiError(
      corpo.error ?? `Falha na requisicao (${resposta.status}).`,
      resposta.status,
      corpo.detalhes?.fieldErrors ?? {},
    );
  }

  return corpo.data as T;
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>(caminho),
  post: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
  remover: (caminho: string) => requisitar<void>(caminho, { method: 'DELETE' }),
};
