import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { AvisoDemonstracao } from './AvisoDemonstracao.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

/** Responde /health e /auth/eu conforme o cenario. */
function ambiente({ vitrine = false, demo = false, logado = false }) {
  vi.mocked(api.get).mockImplementation(async (caminho: string) => {
    if (caminho === '/health') {
      return { status: 'ok', modoDemonstracao: demo, vitrinePublica: vitrine } as never;
    }
    return (logado ? { id: 1, login: 'kauan', nome: 'Kauan', avatarUrl: null } : null) as never;
  });
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AvisoDemonstracao />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  ambiente({});
});

describe('AvisoDemonstracao', () => {
  test('servidor comum e usuario logado: nenhum aviso', async () => {
    ambiente({ logado: true });
    renderizar();

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('visitante na vitrine: convite para entrar', async () => {
    ambiente({ vitrine: true });
    renderizar();

    const aviso = await screen.findByRole('status');

    expect(aviso).toHaveTextContent('vendo uma demonstração');
    expect(screen.getByRole('link', { name: /Entre com o GitHub/ })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  test('usuario logado num servidor de vitrine nao ve o convite', async () => {
    // Ele tem conta: o aviso de visitante nao se aplica.
    ambiente({ vitrine: true, logado: true });
    renderizar();

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByText(/vendo uma demonstração/)).not.toBeInTheDocument();
  });

  test('modo demonstracao com usuario logado: avisa o limite das acoes', async () => {
    ambiente({ demo: true, logado: true });
    renderizar();

    expect(await screen.findByRole('status')).toHaveTextContent('Apagar editais está desativado');
  });
});
