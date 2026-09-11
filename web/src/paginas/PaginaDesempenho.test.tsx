import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../lib/api.js';
import type { DesempenhoDisciplina, DesempenhoTopico } from '../types/api.js';
import { PaginaDesempenho } from './PaginaDesempenho.js';

vi.mock('../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

function disciplina(parcial: Partial<DesempenhoDisciplina>): DesempenhoDisciplina {
  return {
    disciplinaId: 1,
    disciplina: 'Disciplina',
    peso: 1,
    cargoId: 7,
    cargo: 'Área de Computação',
    concursoId: 1,
    concurso: 'Concurso Alfa',
    totalSessoes: 3,
    totalMinutos: 180,
    acertos: 10,
    erros: 5,
    brancos: 0,
    percentualAcerto: 66.7,
    ...parcial,
  };
}

function topico(parcial: Partial<DesempenhoTopico>): DesempenhoTopico {
  return {
    topicoId: 1,
    codigoEdital: '1.1',
    topico: 'Tópico',
    ordem: 1,
    disciplinaId: 1,
    disciplina: 'Disciplina',
    totalSessoes: 1,
    totalMinutos: 60,
    acertos: 5,
    erros: 5,
    brancos: 0,
    ultimoEstudo: '2026-09-01',
    percentualAcerto: 50,
    ...parcial,
  };
}

const DISCIPLINAS = [
  disciplina({ disciplinaId: 1, disciplina: 'Sistemas Operacionais', percentualAcerto: 51.8 }),
  disciplina({ disciplinaId: 2, disciplina: 'Redes', percentualAcerto: 81.1 }),
];

const TOPICOS = [
  topico({ topicoId: 10, topico: 'Escalonamento', percentualAcerto: 33.3, codigoEdital: '4.4' }),
  topico({ topicoId: 11, topico: 'Memória virtual', percentualAcerto: null, codigoEdital: '4.2' }),
];

function renderizar(rota: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/cargos/:cargoId/dashboard" element={<PaginaDesempenho />} />
          <Route path="/cargos/:cargoId/dashboard/:disciplinaId" element={<PaginaDesempenho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (caminho: string) => {
    if (caminho.includes('/dashboard/disciplinas')) return DISCIPLINAS as never;
    if (caminho.includes('/dashboard/topicos')) return TOPICOS as never;
    return [] as never;
  });
});

describe('PaginaDesempenho — visao macro', () => {
  test('lista as disciplinas na ordem que a API devolveu (pior primeiro)', async () => {
    renderizar('/cargos/7/dashboard');

    const nomes = await screen.findAllByRole('link', { name: /Sistemas Operacionais|Redes/ });

    expect(nomes.map((n) => n.textContent)).toEqual(['Sistemas Operacionais', 'Redes']);
  });

  test('cada disciplina leva ao proprio ranking de topicos', async () => {
    renderizar('/cargos/7/dashboard');

    expect(await screen.findByRole('link', { name: 'Sistemas Operacionais' })).toHaveAttribute(
      'href',
      '/cargos/7/dashboard/1',
    );
  });

  test('sem nenhuma disciplina, explica o que fazer', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderizar('/cargos/7/dashboard');

    expect(await screen.findByText('Ainda não há o que medir')).toBeInTheDocument();
  });
});

describe('PaginaDesempenho — visao micro', () => {
  test('sem disciplina na URL, convida a escolher uma', async () => {
    renderizar('/cargos/7/dashboard');

    expect(await screen.findByText('Nenhuma disciplina selecionada')).toBeInTheDocument();
  });

  test('com disciplina na URL, lista os topicos dela', async () => {
    renderizar('/cargos/7/dashboard/1');

    expect(await screen.findByText('Escalonamento')).toBeInTheDocument();
    expect(screen.getByText('Memória virtual')).toBeInTheDocument();
  });

  test('topico sem questoes resolvidas aparece com travessao, nao com zero', async () => {
    renderizar('/cargos/7/dashboard/1');

    await screen.findByText('Memória virtual');

    expect(screen.getByText('33,3%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('cada topico leva de volta ao edital, ja aberto naquele item', async () => {
    renderizar('/cargos/7/dashboard/1');

    expect(await screen.findByRole('link', { name: 'Escalonamento' })).toHaveAttribute(
      'href',
      '/cargos/7/edital?topico=10',
    );
  });
});
