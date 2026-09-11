import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../lib/api.js';
import type { Edital } from '../types/api.js';
import { PaginaEdital } from './PaginaEdital.js';

vi.mock('../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const EDITAL: Edital = {
  cargo: { id: 7, nome: 'Área de Computação' },
  concurso: { id: 1, nome: 'Concurso Alfa', banca: 'Banca Alfa', dataProva: null },
  disciplinas: [
    {
      disciplinaId: 16,
      disciplina: 'Algoritmos',
      peso: 1,
      cargoId: 7,
      cargo: 'Área de Computação',
      concursoId: 1,
      concurso: 'Concurso Alfa',
      totalSessoes: 2,
      totalMinutos: 120,
      acertos: 8,
      erros: 2,
      brancos: 0,
      percentualAcerto: 80,
      topicos: [
        {
          topicoId: 75,
          codigoEdital: '1.1',
          topico: 'Estruturas lineares.',
          ordem: 1,
          disciplinaId: 16,
          disciplina: 'Algoritmos',
          totalSessoes: 2,
          totalMinutos: 120,
          acertos: 8,
          erros: 2,
          brancos: 0,
          ultimoEstudo: '2026-09-01',
          percentualAcerto: 80,
        },
        {
          topicoId: 76,
          codigoEdital: '1.2',
          topico: 'Árvores binárias.',
          ordem: 2,
          disciplinaId: 16,
          disciplina: 'Algoritmos',
          totalSessoes: 0,
          totalMinutos: 0,
          acertos: 0,
          erros: 0,
          brancos: 0,
          ultimoEstudo: null,
          percentualAcerto: null,
        },
      ],
    },
    {
      disciplinaId: 17,
      disciplina: 'Redes',
      peso: 2,
      cargoId: 7,
      cargo: 'Área de Computação',
      concursoId: 1,
      concurso: 'Concurso Alfa',
      totalSessoes: 0,
      totalMinutos: 0,
      acertos: 0,
      erros: 0,
      brancos: 0,
      percentualAcerto: null,
      topicos: [
        {
          topicoId: 90,
          codigoEdital: '2.1',
          topico: 'Modelo OSI.',
          ordem: 1,
          disciplinaId: 17,
          disciplina: 'Redes',
          totalSessoes: 0,
          totalMinutos: 0,
          acertos: 0,
          erros: 0,
          brancos: 0,
          ultimoEstudo: null,
          percentualAcerto: null,
        },
      ],
    },
  ],
};

function EspiaoDeUrl() {
  const local = useLocation();
  return <output data-testid="url">{local.pathname + local.search}</output>;
}

function renderizar(rotaInicial = '/cargos/7/edital') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rotaInicial]}>
        <Routes>
          <Route path="/cargos/:cargoId/edital" element={<PaginaEdital />} />
        </Routes>
        <EspiaoDeUrl />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (caminho: string) => {
    if (caminho.includes('/edital')) return EDITAL as never;
    return [] as never;
  });
});

describe('PaginaEdital', () => {
  test('agrupa os topicos sob a disciplina, como no edital impresso', async () => {
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Algoritmos', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Redes', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Estruturas lineares.')).toBeInTheDocument();
    expect(screen.getByText('Modelo OSI.')).toBeInTheDocument();
  });

  test('resume o edital: total, estudados e cobertura', async () => {
    renderizar();

    const resumo = await screen.findByLabelText('Resumo do edital');

    expect(resumo).toHaveTextContent('3');   // topicos
    expect(resumo).toHaveTextContent('1');   // estudados
    expect(resumo).toHaveTextContent('33% do edital');
    expect(resumo).toHaveTextContent('2h');  // tempo somado das disciplinas
  });

  test('abre o topico indicado pela URL, sem precisar de clique', async () => {
    renderizar('/cargos/7/edital?topico=75');

    expect(await screen.findByRole('button', { name: 'Registrar sessão' })).toBeInTheDocument();
  });

  test('clicar em um topico grava o estado na URL', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { expanded: false, name: /Modelo OSI/ }));

    await waitFor(() =>
      expect(screen.getByTestId('url')).toHaveTextContent('/cargos/7/edital?topico=90'),
    );
  });

  test('clicar de novo no mesmo topico fecha e limpa a URL', async () => {
    const usuario = userEvent.setup();
    renderizar('/cargos/7/edital?topico=90');

    await usuario.click(await screen.findByRole('button', { expanded: true }));

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/cargos/7/edital'));
    expect(screen.getByTestId('url')).not.toHaveTextContent('topico=90');
  });

  test('avisa quando o edital nao carrega, em vez de tela branca', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('sem rede'));
    renderizar();

    expect(await screen.findByText('Edital não encontrado')).toBeInTheDocument();
  });
});
