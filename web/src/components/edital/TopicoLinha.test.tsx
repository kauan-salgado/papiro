import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { renderComProvedores } from '../../test/utils.js';
import type { DesempenhoTopico } from '../../types/api.js';
import { TopicoLinha } from './TopicoLinha.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), remover: vi.fn() } };
});

function topico(parcial: Partial<DesempenhoTopico> = {}): DesempenhoTopico {
  return {
    topicoId: 75,
    codigoEdital: '2.1',
    topico: 'Estruturas lineares: vetores, listas encadeadas, pilhas e filas.',
    ordem: 1,
    disciplinaId: 16,
    disciplina: 'Algoritmos',
    totalSessoes: 2,
    totalMinutos: 220,
    acertos: 23,
    erros: 9,
    brancos: 2,
    ultimoEstudo: '2026-07-24',
    percentualAcerto: 67.6,
    ...parcial,
  };
}

function renderizar(aberto: boolean, aoAlternar = vi.fn()) {
  renderComProvedores(
    <TopicoLinha topico={topico()} cargoId={7} aberto={aberto} aoAlternar={aoAlternar} />,
  );

  return aoAlternar;
}

describe('TopicoLinha', () => {
  test('mostra codigo do edital, texto do item e metricas', () => {
    renderizar(false);

    expect(screen.getByText('2.1')).toBeInTheDocument();
    expect(screen.getByText(/Estruturas lineares/)).toBeInTheDocument();
    expect(screen.getByText('3h 40min')).toBeInTheDocument();
    expect(screen.getByText('67,6%')).toBeInTheDocument();
  });

  test('topico sem sessao aparece como nao estudado', () => {
    renderComProvedores(
      <TopicoLinha
        topico={topico({ totalSessoes: 0, totalMinutos: 0, percentualAcerto: null })}
        cargoId={7}
        aberto={false}
        aoAlternar={vi.fn()}
      />,
    );

    expect(screen.getByText('não estudado')).toBeInTheDocument();
  });

  test('fechado, nao renderiza o formulario', () => {
    renderizar(false);

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar sessão' })).not.toBeInTheDocument();
  });

  test('aberto, traz o formulario e o historico no lugar — sem navegar', async () => {
    renderizar(true);

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar sessão' })).toBeInTheDocument();
    expect(await screen.findByText(/Nenhuma sessão registrada/)).toBeInTheDocument();
  });

  test('o gatilho aponta para o painel que controla', () => {
    renderizar(true);

    const gatilho = screen.getByRole('button', { expanded: true });
    const painelId = gatilho.getAttribute('aria-controls');

    expect(painelId).toBe('painel-topico-75');
    expect(document.getElementById(painelId ?? '')).toBeInTheDocument();
  });

  test('clicar avisa quem controla o estado, com o id do topico', async () => {
    const aoAlternar = renderizar(false);
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { expanded: false }));

    expect(aoAlternar).toHaveBeenCalledWith(75);
  });

  test('funciona pelo teclado', async () => {
    const aoAlternar = renderizar(false);
    const usuario = userEvent.setup();

    await usuario.tab();
    await usuario.keyboard('{Enter}');

    expect(aoAlternar).toHaveBeenCalledWith(75);
  });
});
