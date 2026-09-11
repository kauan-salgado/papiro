import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { renderComProvedores } from '../../test/utils.js';
import type { Sessao } from '../../types/api.js';
import { HistoricoSessoes } from './HistoricoSessoes.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const TOPICO_ID = 42;
const CARGO_ID = 7;

function sessao(parcial: Partial<Sessao> = {}): Sessao {
  return {
    id: 1,
    topicoId: TOPICO_ID,
    simuladoId: null,
    data: '2026-09-10',
    tempoMinutos: 90,
    tipoEstudo: 'Teoria',
    questoesAcertadas: null,
    questoesErradas: null,
    questoesBrancas: null,
    observacoes: null,
    simulado: null,
    ...parcial,
  };
}

beforeEach(() => {
  vi.mocked(api.remover).mockResolvedValue(undefined);
});

function renderizar() {
  return renderComProvedores(<HistoricoSessoes topicoId={TOPICO_ID} cargoId={CARGO_ID} />);
}

describe('HistoricoSessoes', () => {
  test('mostra data, tipo e duracao formatados', async () => {
    vi.mocked(api.get).mockResolvedValue([sessao()]);
    renderizar();

    expect(await screen.findByText('10/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Teoria')).toBeInTheDocument();
    expect(screen.getByText('1h 30min')).toBeInTheDocument();
  });

  test('mostra o placar apenas em sessao de questoes', async () => {
    vi.mocked(api.get).mockResolvedValue([
      sessao({
        id: 2,
        tipoEstudo: 'Questoes',
        questoesAcertadas: 12,
        questoesErradas: 3,
        questoesBrancas: 1,
      }),
    ]);
    renderizar();

    expect(await screen.findByText('12/16 questões')).toBeInTheDocument();
  });

  test('identifica a sessao que pertence a um simulado', async () => {
    vi.mocked(api.get).mockResolvedValue([
      sessao({ simuladoId: 9, simulado: { id: 9, nome: 'Simulado 01' } }),
    ]);
    renderizar();

    expect(await screen.findByText('Simulado 01')).toBeInTheDocument();
  });

  test('diz que nao ha sessoes em vez de mostrar lista vazia', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderizar();

    expect(
      await screen.findByText('Nenhuma sessão registrada neste tópico ainda.'),
    ).toBeInTheDocument();
  });

  test('exclui a sessao pelo id, individualmente', async () => {
    vi.mocked(api.get).mockResolvedValue([sessao({ id: 77 }), sessao({ id: 78, data: '2026-09-01' })]);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: /Excluir sessão de 10\/09\/2026/ }));

    await waitFor(() => expect(api.remover).toHaveBeenCalledWith('/sessoes/77'));
    expect(api.remover).toHaveBeenCalledTimes(1);
  });

  test('cada sessao tem um botao de exclusao com rotulo proprio', async () => {
    vi.mocked(api.get).mockResolvedValue([sessao({ id: 77 }), sessao({ id: 78, data: '2026-09-01' })]);
    renderizar();

    expect(await screen.findAllByRole('button', { name: /Excluir sessão de/ })).toHaveLength(2);
  });
});
