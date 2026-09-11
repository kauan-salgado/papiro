import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../lib/api.js';
import { PaginaNovoEdital } from './PaginaNovoEdital.js';

vi.mock('../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

function Url() {
  return <output data-testid="url">{useLocation().pathname}</output>;
}

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/novo']}>
        <Routes>
          <Route path="/novo" element={<PaginaNovoEdital />} />
          <Route path="/cargos/:cargoId/importar" element={<p>tela de importação</p>} />
        </Routes>
        <Url />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function preencher(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Concurso'), 'Tribunal de Justiça');
  await usuario.type(screen.getByLabelText(/Banca/), 'FGV');
  await usuario.type(screen.getByLabelText('Cargo'), 'Analista de TI');
}

beforeEach(() => {
  vi.mocked(api.post).mockImplementation(async (caminho: string) =>
    (caminho === '/concursos' ? { id: 9 } : { id: 37 }) as never,
  );
});

describe('PaginaNovoEdital', () => {
  test('so habilita o envio com concurso e cargo preenchidos', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const botao = screen.getByRole('button', { name: /Criar/ });
    expect(botao).toBeDisabled();

    await usuario.type(screen.getByLabelText('Concurso'), 'Tribunal de Justiça');
    expect(botao).toBeDisabled();

    await usuario.type(screen.getByLabelText('Cargo'), 'Analista de TI');
    expect(botao).toBeEnabled();
  });

  test('cria o concurso e, com o id dele, o cargo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: /Criar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));

    expect(api.post).toHaveBeenNthCalledWith(1, '/concursos', {
      nome: 'Tribunal de Justiça',
      banca: 'FGV',
      dataProva: null,
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/cargos', {
      concursoId: 9,
      nome: 'Analista de TI',
    });
  });

  test('campos opcionais em branco viram null, e nao string vazia', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('Concurso'), 'Concurso sem banca');
    await usuario.type(screen.getByLabelText('Cargo'), 'Cargo');
    await usuario.click(screen.getByRole('button', { name: /Criar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/concursos',
      expect.objectContaining({ banca: null, dataProva: null }),
    );
  });

  test('leva direto para a importacao do cargo criado', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: /Criar/ }));

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/cargos/37/importar'));
  });

  test('falha na criacao mostra o erro e mantem o formulario', async () => {
    const { ApiError } = await vi.importActual<typeof import('../lib/api.js')>('../lib/api.js');
    vi.mocked(api.post).mockRejectedValue(new ApiError('Dados invalidos.', 400));

    const usuario = userEvent.setup();
    renderizar();

    await preencher(usuario);
    await usuario.click(screen.getByRole('button', { name: /Criar/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados invalidos.');
    expect(screen.getByTestId('url')).toHaveTextContent('/novo');
  });
});
