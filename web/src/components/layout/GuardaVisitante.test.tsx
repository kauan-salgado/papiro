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

function comVitrine(ligada: boolean) {
  vi.mocked(api.get).mockImplementation(async (caminho: string) => {
    if (caminho === '/health') {
      return { status: 'ok', modoDemonstracao: false, vitrinePublica: ligada } as never;
    }
    return null as never; // visitante: sem sessao
  });
}

function renderizar(exigirConta = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/protegida']}>
        <Routes>
          <Route path="/entrar" element={<p>tela de login</p>} />
          <Route
            path="/protegida"
            element={
              <Guarda exigirConta={exigirConta}>
                <p>conteúdo</p>
              </Guarda>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  comVitrine(true);
});

describe('Guarda com a vitrine aberta', () => {
  test('visitante ve as telas de leitura sem entrar', async () => {
    renderizar();

    expect(await screen.findByText('conteúdo')).toBeInTheDocument();
  });

  test('mas nao alcanca as telas que escrevem', async () => {
    // Importar edital e cadastrar concurso exigem conta: a vitrine e so leitura.
    renderizar(true);

    expect(await screen.findByText('tela de login')).toBeInTheDocument();
  });

  test('com a vitrine fechada, visitante volta para o login', async () => {
    comVitrine(false);
    renderizar();

    expect(await screen.findByText('tela de login')).toBeInTheDocument();
  });
});
