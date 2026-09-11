import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUsuario } from '../../hooks/useUsuario.js';
import { Carregando } from '../ui/Carregando.js';

/**
 * Porta das telas que exigem conta.
 *
 * Enquanto a consulta nao volta, mostra esqueleto: redirecionar antes da
 * resposta jogaria para o login quem ja esta autenticado, a cada F5.
 */
export function Guarda({ children }: { readonly children: ReactNode }) {
  const { usuario, carregando } = useUsuario();
  const local = useLocation();

  if (carregando) {
    return <Carregando linhas={5} rotulo="Verificando sua sessão" />;
  }

  if (!usuario) {
    // `state` guarda de onde a pessoa veio, para voltar ao lugar certo depois.
    return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;
  }

  return <>{children}</>;
}
