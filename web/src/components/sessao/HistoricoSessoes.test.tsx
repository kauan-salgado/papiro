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
    cargoId: CARGO_ID,
    disciplinaId: 5,
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
    topico: null,
    disciplina: null,
    ...parcial,
  };
}

beforeEach(() => {
  vi.mocked(api.remover).mockResolvedValue(undefined);
});

function renderizar() {
  return renderComProvedores(
    <HistoricoSessoes alvo={{ tipo: 'topico', id: TOPICO_ID }} cargoId={CARGO_ID} />,
  );
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

  test('no histórico da matéria, mostra de qual item veio cada sessão', async () => {
    vi.mocked(api.get).mockResolvedValue([
      sessao({ id: 9, topico: { id: 3, codigoEdital: '2.1', descricao: 'Criptografia.' } }),
      sessao({ id: 10, topicoId: null, topico: null }),
    ]);

    renderComProvedores(
      <HistoricoSessoes alvo={{ tipo: 'disciplina', id: 5 }} cargoId={CARGO_ID} />,
    );

    // A que veio de um item mostra o código; a avulsa não mostra nada.
    expect(await screen.findByText('2.1')).toBeInTheDocument();
    expect(screen.getAllByText('2.1')).toHaveLength(1);
  });

  test('no histórico do edital, cada linha diz de que nível veio', async () => {
    vi.mocked(api.get).mockResolvedValue([
      sessao({ id: 1, topico: { id: 3, codigoEdital: '2.1', descricao: 'Criptografia.' }, disciplina: { id: 5, nome: 'Segurança' } }),
      sessao({ id: 2, topicoId: null, disciplina: { id: 5, nome: 'Segurança' } }),
      sessao({ id: 3, topicoId: null, disciplinaId: null }),
    ]);

    renderComProvedores(<HistoricoSessoes alvo={{ tipo: 'cargo', id: CARGO_ID }} cargoId={CARGO_ID} />);

    expect(await screen.findByText('2.1')).toBeInTheDocument();   // item do edital
    expect(screen.getByText('Segurança')).toBeInTheDocument();     // bateria da matéria
    expect(screen.getByText('geral')).toBeInTheDocument();         // simulado
  });

  test('no histórico do próprio tópico, não repete o código a cada linha', async () => {
    vi.mocked(api.get).mockResolvedValue([
      sessao({ topico: { id: 3, codigoEdital: '2.1', descricao: 'Criptografia.' } }),
    ]);

    renderComProvedores(
      <HistoricoSessoes alvo={{ tipo: 'topico', id: TOPICO_ID }} cargoId={CARGO_ID} />,
    );

    await screen.findByText('Teoria');
    expect(screen.queryByText('2.1')).not.toBeInTheDocument();
  });

  test('cada sessao tem um botao de exclusao com rotulo proprio', async () => {
    vi.mocked(api.get).mockResolvedValue([sessao({ id: 77 }), sessao({ id: 78, data: '2026-09-01' })]);
    renderizar();

    expect(await screen.findAllByRole('button', { name: /Excluir sessão de/ })).toHaveLength(2);
  });
});
