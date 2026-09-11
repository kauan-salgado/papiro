import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../lib/api.js';
import { renderComProvedores } from '../test/utils.js';
import type { Cargo } from '../types/api.js';
import { PaginaInicial } from './PaginaInicial.js';

vi.mock('../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const CARGOS: Cargo[] = [
  {
    id: 7,
    concursoId: 1,
    nome: 'Área de Computação',
    concurso: { id: 1, nome: 'Concurso Alfa', banca: 'Banca Alfa' },
    _count: { disciplinas: 8, simulados: 1 },
    totais: { topicos: 0, sessoes: 0 },
  },
  {
    id: 8,
    concursoId: 2,
    nome: 'Perfil de Segurança',
    concurso: { id: 2, nome: 'Concurso Beta', banca: null },
    _count: { disciplinas: 6, simulados: 0 },
    totais: { topicos: 0, sessoes: 0 },
  },
];

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(CARGOS);
});

describe('PaginaInicial', () => {
  test('lista um cartao por edital em disputa', async () => {
    renderComProvedores(<PaginaInicial />);

    expect(await screen.findByText('Concurso Alfa')).toBeInTheDocument();
    expect(screen.getByText('Concurso Beta')).toBeInTheDocument();
    expect(screen.getByText('8 disciplinas')).toBeInTheDocument();
  });

  test('cada cartao leva ao edital e ao desempenho daquele cargo', async () => {
    renderComProvedores(<PaginaInicial />);

    const links = await screen.findAllByRole('link', { name: 'Abrir edital' });

    expect(links[0]).toHaveAttribute('href', '/cargos/7/edital');
    expect(screen.getAllByRole('link', { name: 'Ver desempenho' })[1]).toHaveAttribute(
      'href',
      '/cargos/8/dashboard',
    );
  });

  test('concurso sem banca informada nao mostra campo vazio', async () => {
    renderComProvedores(<PaginaInicial />);

    expect(await screen.findByText('banca não informada')).toBeInTheDocument();
  });

  test('conta vazia oferece os dois caminhos: exemplo e edital proprio', async () => {
    // Antes esta tela mandava rodar `npm run seed` no terminal — o app pedindo
    // que o usuario saisse do app.
    vi.mocked(api.get).mockResolvedValue([]);
    renderComProvedores(<PaginaInicial />);

    expect(await screen.findByText('Sua conta está vazia')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Carregar editais de exemplo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar o meu edital' })).toHaveAttribute(
      'href',
      '/novo',
    );
  });

  test('o botao de exemplos chama a rota e recarrega a lista', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      concursosCriados: 2,
      topicosCriados: 70,
      sessoesCriadas: 120,
      jaExistiam: 0,
    });

    renderComProvedores(<PaginaInicial />);

    await usuario.click(await screen.findByRole('button', { name: 'Carregar editais de exemplo' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/exemplos', {}));
  });

  test('oferece cadastrar um edital novo mesmo com a lista cheia', async () => {
    renderComProvedores(<PaginaInicial />);

    expect(await screen.findByRole('link', { name: '+ Novo edital' })).toHaveAttribute(
      'href',
      '/novo',
    );
  });

  test('API fora do ar vira instrucao, nao tela branca', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('conexao recusada'));
    renderComProvedores(<PaginaInicial />);

    expect(await screen.findByText('Não foi possível falar com a API')).toBeInTheDocument();
    expect(screen.getByText(/docker compose up -d/)).toBeInTheDocument();
  });
});
