import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { Guarda } from './Guarda.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cargos/7/edital']}>
        <Routes>
          <Route path="/entrar" element={<p>tela de login</p>} />
          <Route
            path="/cargos/:cargoId/edital"
            element={
              <Guarda>
                <p>conteúdo protegido</p>
              </Guarda>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(null);
});

describe('Guarda', () => {
  test('visitante sem sessao vai para o login', async () => {
    renderizar();

    expect(await screen.findByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
  });

  test('usuario autenticado ve o conteudo', async () => {
    vi.mocked(api.get).mockResolvedValue({ id: 1, login: 'kauan', nome: 'Kauan', avatarUrl: null });
    renderizar();

    expect(await screen.findByText('conteúdo protegido')).toBeInTheDocument();
  });

  test('enquanto a sessao e verificada, nao joga ninguem para o login', async () => {
    // Um F5 com sessao valida nao pode piscar a tela de entrar: o redirect so
    // acontece depois da resposta.
    vi.mocked(api.get).mockImplementation(
      () => new Promise((resolver) => setTimeout(() => resolver(null), 300)),
    );
    renderizar();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument();
  });
});
