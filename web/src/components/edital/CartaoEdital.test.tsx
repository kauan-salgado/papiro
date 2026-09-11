import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../../lib/api.js';
import { renderComProvedores } from '../../test/utils.js';
import type { Cargo } from '../../types/api.js';
import { CartaoEdital } from './CartaoEdital.js';

vi.mock('../../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

function cargo(parcial: Partial<Cargo> = {}): Cargo {
  return {
    id: 7,
    concursoId: 3,
    nome: 'Perfil 5 — Segurança',
    concurso: { id: 3, nome: 'DATAPREV 2026', banca: 'Banca Alfa' },
    _count: { disciplinas: 9, simulados: 0 },
    totais: { topicos: 94, sessoes: 12 },
    ...parcial,
  };
}

beforeEach(() => {
  vi.mocked(api.remover).mockResolvedValue(undefined);
});

describe('CartaoEdital', () => {
  test('mostra o tamanho do edital, e não só o nome', () => {
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    expect(screen.getByText('9 disciplinas')).toBeInTheDocument();
    expect(screen.getByText('94 tópicos')).toBeInTheDocument();
    expect(screen.getByText('12 sessões')).toBeInTheDocument();
  });

  test('não apaga no primeiro clique', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));

    expect(api.remover).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  test('a confirmação diz exatamente o que será perdido', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));
    const aviso = screen.getByRole('alertdialog');

    expect(aviso).toHaveTextContent('94 tópicos');
    expect(aviso).toHaveTextContent('12 sessões de estudo');
    expect(aviso).toHaveTextContent('Não dá para desfazer');
  });

  test('edital sem estudo registrado não menciona sessões', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(
      <CartaoEdital cargo={cargo({ totais: { topicos: 5, sessoes: 0 } })} somenteLeitura={false} />,
    );

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));

    expect(screen.getByRole('alertdialog')).not.toHaveTextContent('sessões de estudo');
  });

  test('usa singular quando é um só', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(
      <CartaoEdital cargo={cargo({ totais: { topicos: 1, sessoes: 1 } })} somenteLeitura={false} />,
    );

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));

    expect(screen.getByRole('alertdialog')).toHaveTextContent('1 tópico e 1 sessão de estudo');
  });

  test('cancelar volta atrás sem apagar', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(api.remover).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Abrir edital' })).toBeInTheDocument();
  });

  test('confirmar apaga pelo cargo', async () => {
    const usuario = userEvent.setup();
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));
    await usuario.click(screen.getByRole('button', { name: 'Apagar edital' }));

    await waitFor(() => expect(api.remover).toHaveBeenCalledWith('/cargos/7'));
  });

  test('falha ao apagar avisa e mantém o edital na tela', async () => {
    vi.mocked(api.remover).mockRejectedValue(new Error('sem rede'));

    const usuario = userEvent.setup();
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura={false} />);

    await usuario.click(screen.getByRole('button', { name: /Apagar o edital/ }));
    await usuario.click(screen.getByRole('button', { name: 'Apagar edital' }));

    expect(await screen.findByText('Não foi possível apagar. Tente de novo.')).toBeInTheDocument();
  });

  test('visitante não vê o botão de apagar', () => {
    renderComProvedores(<CartaoEdital cargo={cargo()} somenteLeitura />);

    expect(screen.queryByRole('button', { name: /Apagar o edital/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir edital' })).toBeInTheDocument();
  });
});
