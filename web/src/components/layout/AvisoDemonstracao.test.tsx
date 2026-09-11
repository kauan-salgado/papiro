import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { renderComProvedores } from '../../test/utils.js';
import { AvisoDemonstracao } from './AvisoDemonstracao.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ status: 'ok', modoDemonstracao: false });
});

describe('AvisoDemonstracao', () => {
  test('some quando o backend nao esta em modo demonstracao', async () => {
    renderComProvedores(<AvisoDemonstracao />);

    // Espera a consulta resolver antes de concluir que nao ha aviso.
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledWith('/health'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('avisa o visitante quando a vitrine esta protegida', async () => {
    vi.mocked(api.get).mockResolvedValue({ status: 'ok', modoDemonstracao: true });
    renderComProvedores(<AvisoDemonstracao />);

    const aviso = await screen.findByRole('status');

    expect(aviso).toHaveTextContent('Demonstração pública');
    expect(aviso).toHaveTextContent('Apagar editais está desativado');
  });

  test('API fora do ar nao mostra aviso enganoso', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('sem rede'));
    renderComProvedores(<AvisoDemonstracao />);

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
