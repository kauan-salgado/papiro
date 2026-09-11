import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../lib/api.js';
import { PaginaImportar } from './PaginaImportar.js';

vi.mock('../lib/api.js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../lib/api.js')>();
  return { ...original, api: { get: vi.fn(), post: vi.fn(), remover: vi.fn() } };
});

const TEXTO = `SEGURANÇA DA INFORMAÇÃO
1.1 Confidencialidade e integridade.
1.2 Criptografia simétrica.
REDES
2.1 Modelo OSI.`;

const EDITAL_VAZIO = {
  cargo: { id: 37, nome: 'Analista' },
  concurso: { id: 9, nome: 'Concurso Alfa', banca: 'Banca Alfa', dataProva: null },
  disciplinas: [],
};

function Url() {
  return <output data-testid="url">{useLocation().pathname}</output>;
}

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cargos/37/importar']}>
        <Routes>
          <Route path="/cargos/:cargoId/importar" element={<PaginaImportar />} />
          <Route path="/cargos/:cargoId/edital" element={<p>tela do edital</p>} />
        </Routes>
        <Url />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function colarEAnalisar(usuario: ReturnType<typeof userEvent.setup>, texto = TEXTO) {
  await usuario.click(screen.getByLabelText('Texto do edital'));
  await usuario.paste(texto);
  await usuario.click(screen.getByRole('button', { name: 'Analisar texto' }));
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(EDITAL_VAZIO);
  vi.mocked(api.post).mockResolvedValue({
    disciplinasCriadas: 2,
    topicosCriados: 3,
    topicosIgnorados: 0,
  });
});

describe('PaginaImportar — analise', () => {
  test('nao grava nada ao analisar: so mostra a previa', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);

    expect(await screen.findByText('3 itens em 2 disciplinas. Edite o que o reconhecimento errou — nada foi gravado ainda.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('agrupa os itens reconhecidos por disciplina', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);

    expect(await screen.findByRole('heading', { name: /SEGURANÇA DA INFORMAÇÃO/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /REDES/ })).toBeInTheDocument();
  });

  test('texto sem numeracao reconhecivel avisa em vez de gravar lixo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario, '   ');

    // Botao fica desabilitado com texto em branco: nem chega a analisar.
    expect(screen.getByRole('button', { name: 'Analisar texto' })).toBeDisabled();
  });

  test('o botao de analisar so liga quando ha texto', async () => {
    const usuario = userEvent.setup();
    renderizar();

    expect(screen.getByRole('button', { name: 'Analisar texto' })).toBeDisabled();

    await usuario.click(screen.getByLabelText('Texto do edital'));
    await usuario.paste('1.1 Algo.');

    expect(screen.getByRole('button', { name: 'Analisar texto' })).toBeEnabled();
  });

  test('usa a disciplina padrao quando o texto nao traz cabecalho', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByLabelText(/Disciplina padrão/));
    await usuario.paste('Banco de Dados');
    await colarEAnalisar(usuario, '1.1 Modelo relacional.');

    expect(await screen.findByRole('heading', { name: /Banco de Dados/ })).toBeInTheDocument();
  });
});

describe('PaginaImportar — conferencia editavel', () => {
  test('permite corrigir a descricao antes de gravar', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);

    const campo = await screen.findByLabelText('Descrição do item 1');
    await usuario.clear(campo);
    await usuario.type(campo, 'Texto corrigido.');
    await usuario.click(screen.getByRole('button', { name: /Importar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const enviados = vi.mocked(api.post).mock.calls[0]?.[1] as { itens: { descricao: string }[] };
    expect(enviados.itens[0]?.descricao).toBe('Texto corrigido.');
  });

  test('remover uma linha tira o item do que sera gravado', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Remover item 1' }));

    expect(screen.getByRole('button', { name: 'Importar 2 itens' })).toBeInTheDocument();
  });

  test('envia para o endpoint de importacao em lote do cargo da URL', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);
    await usuario.click(await screen.findByRole('button', { name: /Importar/ }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/cargos/37/edital/importar',
        expect.objectContaining({ substituir: false }),
      ),
    );
  });

  test('depois de gravar, leva para o edital', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);
    await usuario.click(await screen.findByRole('button', { name: /Importar/ }));

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/cargos/37/edital'));
  });

  test('erro do backend aparece na tela, sem sair da pagina', async () => {
    const { ApiError } = await vi.importActual<typeof import('../lib/api.js')>('../lib/api.js');
    vi.mocked(api.post).mockRejectedValue(new ApiError('Cargo 37 nao encontrado.', 404));

    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);
    await usuario.click(await screen.findByRole('button', { name: /Importar/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cargo 37 nao encontrado.');
    expect(screen.getByTestId('url')).toHaveTextContent('/cargos/37/importar');
  });
});

describe('PaginaImportar — substituicao', () => {
  test('cargo sem edital nao oferece a opcao destrutiva', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);
    await screen.findByRole('button', { name: /Importar/ });

    expect(screen.queryByText(/Substituir o edital atual/)).not.toBeInTheDocument();
  });

  test('cargo que ja tem edital oferece substituir, desmarcado por padrao', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...EDITAL_VAZIO,
      disciplinas: [{ disciplinaId: 1, disciplina: 'Redes', topicos: [] }],
    });

    const usuario = userEvent.setup();
    renderizar();

    await colarEAnalisar(usuario);

    const opcao = await screen.findByRole('checkbox');
    expect(opcao).not.toBeChecked();

    await usuario.click(opcao);
    await usuario.click(screen.getByRole('button', { name: /Importar/ }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/cargos/37/edital/importar',
        expect.objectContaining({ substituir: true }),
      ),
    );
  });
});
