import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api, ApiError } from '../../lib/api.js';
import { renderComProvedores } from '../../test/utils.js';
import { FormularioSessao } from './FormularioSessao.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();

  // ApiError continua sendo a classe real: o formulario faz instanceof nela.
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const TOPICO_ID = 42;
const CARGO_ID = 7;

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue([]);
  vi.mocked(api.post).mockResolvedValue({ id: 1 });
});

function renderizar() {
  return renderComProvedores(
    <FormularioSessao alvo={{ tipo: 'topico', id: TOPICO_ID }} cargoId={CARGO_ID} />,
  );
}

describe('FormularioSessao — parte dinamica', () => {
  test('nao mostra os contadores de questoes por padrao', () => {
    renderizar();

    expect(screen.queryByLabelText('Acertadas')).not.toBeInTheDocument();
  });

  test('escolher "Questoes" revela os tres contadores', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: 'Questões' }));

    expect(screen.getByLabelText('Acertadas')).toBeInTheDocument();
    expect(screen.getByLabelText('Erradas')).toBeInTheDocument();
    expect(screen.getByLabelText('Em branco')).toBeInTheDocument();
  });

  test('voltar para Teoria esconde os contadores de novo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: 'Questões' }));
    await usuario.click(screen.getByRole('radio', { name: 'Teoria' }));

    expect(screen.queryByLabelText('Acertadas')).not.toBeInTheDocument();
  });
});

describe('FormularioSessao — validacao', () => {
  test('acusa tempo e contadores na mesma tentativa', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: 'Questões' }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    expect(await screen.findByText('Informe o tempo de estudo.')).toBeInTheDocument();
    expect(await screen.findAllByText('Obrigatório em sessão de questões.')).toHaveLength(3);
    expect(api.post).not.toHaveBeenCalled();
  });

  test('nao envia sessao com tempo zero', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('Tempo (min)'), '0');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    expect(await screen.findByText('O tempo precisa ser maior que zero.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('FormularioSessao — envio', () => {
  test('envia sessao de Teoria com os contadores nulos', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('Tempo (min)'), '50');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    expect(api.post).toHaveBeenCalledWith(
      '/sessoes',
      expect.objectContaining({
        topicoId: TOPICO_ID,
        tempoMinutos: 50,
        tipoEstudo: 'Teoria',
        questoesAcertadas: null,
        questoesErradas: null,
        questoesBrancas: null,
        simuladoId: null,
      }),
    );
  });

  test('envia os contadores como numero em sessao de Questoes', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: 'Questões' }));
    await usuario.type(screen.getByLabelText('Tempo (min)'), '40');
    await usuario.type(screen.getByLabelText('Acertadas'), '15');
    await usuario.type(screen.getByLabelText('Erradas'), '4');
    await usuario.type(screen.getByLabelText('Em branco'), '1');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    expect(api.post).toHaveBeenCalledWith(
      '/sessoes',
      expect.objectContaining({
        tipoEstudo: 'Questoes',
        questoesAcertadas: 15,
        questoesErradas: 4,
        questoesBrancas: 1,
      }),
    );
  });

  test('limpa os contadores ao trocar de tipo antes de enviar', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('radio', { name: 'Questões' }));
    await usuario.type(screen.getByLabelText('Acertadas'), '15');
    await usuario.click(screen.getByRole('radio', { name: 'Revisão' }));
    await usuario.type(screen.getByLabelText('Tempo (min)'), '25');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    // Se o 15 sobrevivesse a troca, o CHECK do banco recusaria a sessao.
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      '/sessoes',
      expect.objectContaining({ tipoEstudo: 'Revisao', questoesAcertadas: null }),
    );
  });

  test('vincula a sessao ao simulado escolhido, como numero', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { id: 9, cargoId: CARGO_ID, nome: 'Simulado 01', data: '2026-08-30', _count: { sessoes: 0 } },
    ]);

    const usuario = userEvent.setup();
    renderizar();

    // Espera a lista de simulados chegar antes de escolher: o select existe
    // desde o primeiro quadro, mas comeca so com "Sessão avulsa".
    await screen.findByRole('option', { name: /Simulado 01/ });
    await usuario.selectOptions(screen.getByLabelText(/Simulado/), '9');
    await usuario.type(screen.getByLabelText('Tempo (min)'), '30');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/sessoes', expect.objectContaining({ simuladoId: 9 }));
  });
});

describe('FormularioSessao — erro vindo do backend', () => {
  test('mostra a mensagem do banco no campo certo (fallback do 23514)', async () => {
    // Simula o CHECK constraint do Postgres recusando o que o Zod do front
    // deixou passar — o cenario de front e banco dessincronizados.
    vi.mocked(api.post).mockRejectedValue(
      new ApiError('Sessao viola regra do banco.', 400, {
        tempoMinutos: ['O tempo de estudo precisa ser maior que zero.'],
      }),
    );

    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('Tempo (min)'), '30');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    expect(
      await screen.findByText('O tempo de estudo precisa ser maior que zero.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sessao viola regra do banco.');
  });

  test('falha inesperada nao deixa o formulario mudo', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('rede caiu'));

    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('Tempo (min)'), '30');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nao foi possivel registrar a sessao.',
    );
  });
});
