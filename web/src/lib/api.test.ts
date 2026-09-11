import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api, ApiError } from './api.js';

/**
 * O cliente HTTP e a fronteira onde o envelope { success, data, error } vira
 * dado ou excecao. E aqui que os fieldErrors do backend — inclusive os que
 * nasceram de um CHECK constraint — sao preservados para o formulario usar.
 */
function respostaFalsa(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.get', () => {
  test('desembrulha o envelope e devolve so os dados', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaFalsa({ success: true, data: [{ id: 1 }], error: null }),
    );

    await expect(api.get('/cargos')).resolves.toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledWith('/api/cargos', expect.anything());
  });

  test('404 vira ApiError com a mensagem do servidor', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaFalsa({ success: false, data: null, error: 'Concurso 9 nao encontrado.' }, 404),
    );

    await expect(api.get('/concursos/9')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Concurso 9 nao encontrado.',
    });
  });

  test('corpo ilegivel nao derruba a aplicacao', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('nao e JSON');
      },
    } as unknown as Response);

    await expect(api.get('/cargos')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('api.post', () => {
  test('envia JSON e devolve o registro criado', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaFalsa({ success: true, data: { id: 10 }, error: null }, 201),
    );

    await expect(api.post('/sessoes', { tempoMinutos: 30 })).resolves.toEqual({ id: 10 });

    expect(fetch).toHaveBeenCalledWith(
      '/api/sessoes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tempoMinutos: 30 }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  test('preserva os erros por campo vindos da validacao do backend', async () => {
    vi.mocked(fetch).mockResolvedValue(
      respostaFalsa(
        {
          success: false,
          data: null,
          error: 'Dados invalidos.',
          detalhes: { fieldErrors: { questoesAcertadas: ['Obrigatório em sessão de questões.'] } },
        },
        400,
      ),
    );

    const erro = await api.post('/sessoes', {}).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).fieldErrors).toEqual({
      questoesAcertadas: ['Obrigatório em sessão de questões.'],
    });
  });

  test('resposta 200 com success:false ainda e erro', async () => {
    // Defesa contra backend que devolve 200 em cima de falha logica.
    vi.mocked(fetch).mockResolvedValue(
      respostaFalsa({ success: false, data: null, error: 'Falhou mesmo assim.' }, 200),
    );

    await expect(api.post('/sessoes', {})).rejects.toBeInstanceOf(ApiError);
  });
});

describe('api.remover', () => {
  test('204 nao tenta ler corpo nenhum', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('204 nao tem corpo');
      },
    } as unknown as Response);

    await expect(api.remover('/sessoes/1')).resolves.toBeUndefined();
  });
});
