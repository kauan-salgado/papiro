import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAmbiente } from '../../hooks/useAmbiente.js';
import { useUsuario } from '../../hooks/useUsuario.js';
import { Carregando } from '../ui/Carregando.js';

/**
 * Porta das telas que exigem conta.
 *
 * Enquanto a consulta nao volta, mostra esqueleto: redirecionar antes da
 * resposta jogaria para o login quem ja esta autenticado, a cada F5.
 */
export function Guarda({
  children,
  exigirConta = false,
}: {
  readonly children: ReactNode;
  /** Telas que escrevem exigem conta de verdade: visitante nao passa. */
  readonly exigirConta?: boolean;
}) {
  const { usuario, carregando } = useUsuario();
  const ambiente = useAmbiente();
  const local = useLocation();

  // Espera as DUAS respostas. Decidir so com a sessao mandaria o visitante
  // para o login antes de saber que a vitrine esta aberta — e ele iria embora
  // sem ver o projeto.
  if (carregando || ambiente.carregando) {
    return <Carregando linhas={5} rotulo="Verificando sua sessão" />;
  }

  // Vitrine aberta: quem chega sem conta ve a demonstracao em modo leitura,
  // em vez de bater numa tela de login e ir embora sem saber o que o projeto e.
  if (!usuario && ambiente.vitrinePublica && !exigirConta) {
    return <>{children}</>;
  }

  if (!usuario) {
    // `state` guarda de onde a pessoa veio, para voltar ao lugar certo depois.
    return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;
  }

  return <>{children}</>;
}
