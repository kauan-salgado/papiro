import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import type { Cargo } from '../../types/api.js';
import { Cabecalho } from './Cabecalho.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const CARGOS: Cargo[] = [
  {
    id: 7,
    concursoId: 1,
    nome: 'Área de Computação',
    concurso: { id: 1, nome: 'Concurso Alfa', banca: 'Banca Alfa' },
    _count: { disciplinas: 8, simulados: 1 },
  },
  {
    id: 8,
    concursoId: 2,
    nome: 'Perfil de Segurança',
    concurso: { id: 2, nome: 'Concurso Beta', banca: 'Banca Beta' },
    _count: { disciplinas: 6, simulados: 0 },
  },
];

function Url() {
  return <output data-testid="url">{useLocation().pathname}</output>;
}

function renderizar(rota: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="*" element={<Cabecalho />} />
        </Routes>
        <Url />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(CARGOS);
});

describe('Cabecalho', () => {
  test('na home, mostra a marca mas nao o contexto de cargo', async () => {
    renderizar('/');

    expect(await screen.findByRole('link', { name: 'Papiro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  test('dentro de um cargo, mostra concurso, banca e as abas', async () => {
    renderizar('/cargos/7/edital');

    const titulo = await screen.findByRole('heading', { name: 'Área de Computação', level: 1 });

    // Escopo no bloco de contexto: "Concurso Alfa" tambem aparece como opcao
    // do seletor de editais, e a busca solta encontraria as duas.
    const contexto = titulo.closest('.cabecalho-app__contexto');

    expect(contexto).toHaveTextContent('Concurso Alfa');
    expect(contexto).toHaveTextContent('Banca Alfa');
    expect(screen.getByRole('link', { name: 'Edital verticalizado' })).toBeInTheDocument();
  });

  test('trocar de edital mantem a secao em que o usuario estava', async () => {
    const usuario = userEvent.setup();
    renderizar('/cargos/7/dashboard');

    await screen.findByRole('heading', { level: 1 });
    await usuario.selectOptions(screen.getByLabelText('Concurso e cargo'), '8');

    // Estava no desempenho: continua no desempenho, agora do outro cargo.
    expect(screen.getByTestId('url')).toHaveTextContent('/cargos/8/dashboard');
  });
});
