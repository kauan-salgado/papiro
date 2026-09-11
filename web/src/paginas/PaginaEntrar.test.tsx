import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { PaginaEntrar } from './PaginaEntrar.js';

function renderizar(rota = '/entrar') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <PaginaEntrar />
    </MemoryRouter>,
  );
}

describe('PaginaEntrar', () => {
  test('oferece o login do GitHub como navegacao, e nao como botao', () => {
    renderizar();

    // Precisa ser link: o fluxo OAuth e uma sequencia de redirects, e um
    // fetch nao levaria o navegador ao GitHub.
    const link = screen.getByRole('link', { name: /Entrar com GitHub/ });

    expect(link).toHaveAttribute('href', '/api/auth/github');
  });

  test('explica que nao guarda senha nem acessa repositorios', () => {
    renderizar();

    expect(screen.getByText(/não guarda\s+senha/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum acesso aos seus repositórios/i)).toBeInTheDocument();
  });

  test('explica a falha de state sem jargao', () => {
    renderizar('/entrar?erro=estado');

    expect(screen.getByRole('alert')).toHaveTextContent('não conferiu');
  });

  test('explica a falha de comunicacao com o GitHub', () => {
    renderizar('/entrar?erro=github');

    expect(screen.getByRole('alert')).toHaveTextContent('falar com o GitHub');
  });

  test('erro desconhecido ainda diz alguma coisa', () => {
    renderizar('/entrar?erro=algo-novo');

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível entrar');
  });

  test('sem erro na URL, nao mostra alerta', () => {
    renderizar();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
