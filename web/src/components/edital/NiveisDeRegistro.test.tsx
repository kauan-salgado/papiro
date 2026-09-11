import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { PaginaEdital } from '../../paginas/PaginaEdital.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const EDITAL = {
  cargo: { id: 7, nome: 'Perfil 5' },
  concurso: { id: 1, nome: 'Concurso Alfa', banca: 'Banca Alfa', dataProva: null },
  totais: null,
  disciplinas: [
    {
      disciplinaId: 16,
      disciplina: 'Segurança da Informação',
      peso: 1,
      cargoId: 7,
      cargo: 'Perfil 5',
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
          topicoId: 75,
          codigoEdital: '1.1',
          topico: 'Criptografia.',
          ordem: 1,
          disciplinaId: 16,
          disciplina: 'Segurança da Informação',
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

function Url() {
  return <output data-testid="url">{useLocation().search}</output>;
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cargos/7/edital']}>
        <Routes>
          <Route path="/cargos/:cargoId/edital" element={<PaginaEdital />} />
        </Routes>
        <Url />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (caminho: string) => {
    if (caminho.includes('/edital')) return EDITAL as never;
    if (caminho === '/health') return { status: 'ok', modoDemonstracao: false, vitrinePublica: false } as never;
    if (caminho === '/auth/eu') return { id: 1, login: 'kauan', nome: null, avatarUrl: null } as never;
    return [] as never;
  });
  vi.mocked(api.post).mockResolvedValue({ id: 1 });
});

describe('os três níveis de registro', () => {
  test('o edital abre com a linha de simulado no topo', async () => {
    renderizar();

    expect(await screen.findByRole('button', { name: /Simulado/ })).toBeInTheDocument();
  });

  test('a matéria tem seu próprio botão de registro', async () => {
    renderizar();

    expect(
      await screen.findByRole('button', { name: 'registrar na matéria' }),
    ).toBeInTheDocument();
  });

  test('registrar na matéria envia disciplinaId, e não topicoId', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'registrar na matéria' }));
    await usuario.type(await screen.findByLabelText('Tempo (min)'), '60');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const enviado = vi.mocked(api.post).mock.calls[0]?.[1] as Record<string, unknown>;

    expect(enviado['disciplinaId']).toBe(16);
    expect(enviado['topicoId']).toBeUndefined();
    expect(enviado['cargoId']).toBeUndefined();
  });

  test('registrar no simulado envia cargoId apenas', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: /Simulado/ }));
    await usuario.type(await screen.findByLabelText('Tempo (min)'), '240');
    await usuario.click(screen.getByRole('button', { name: 'Registrar sessão' }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const enviado = vi.mocked(api.post).mock.calls[0]?.[1] as Record<string, unknown>;

    expect(enviado['cargoId']).toBe(7);
    expect(enviado['disciplinaId']).toBeUndefined();
  });

  test('cada painel aberto vive na URL', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'registrar na matéria' }));
    expect(screen.getByTestId('url')).toHaveTextContent('materia=16');

    await usuario.click(screen.getByRole('button', { name: /Simulado/ }));
    expect(screen.getByTestId('url')).toHaveTextContent('simulado=1');
  });

  test('abrir um painel fecha o outro', async () => {
    // Dois formulários na tela ao mesmo tempo criariam dúvida sobre onde o
    // estudo vai entrar.
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'registrar na matéria' }));
    await usuario.click(screen.getByRole('button', { name: /Simulado/ }));

    expect(screen.getByTestId('url')).not.toHaveTextContent('materia');
    expect(screen.getAllByRole('button', { name: 'Registrar sessão' })).toHaveLength(1);
  });
});
