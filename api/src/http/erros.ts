/**
 * Erros de aplicacao com status HTTP embutido. Quem lanca nao precisa conhecer
 * o Express; o handler terminal traduz para resposta.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NaoEncontradoError extends AppError {
  constructor(recurso: string, id: number | string) {
    super(`${recurso} ${id} nao encontrado(a).`, 404);
  }
}

export class RequisicaoInvalidaError extends AppError {
  constructor(message: string, detalhes?: unknown) {
    super(message, 400, detalhes);
  }
}

export class ConflitoError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
