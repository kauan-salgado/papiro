import { Link } from 'react-router-dom';
import { useAmbiente, useEhVisitante } from '../../hooks/useAmbiente.js';
import './layout.css';

/**
 * Aviso honesto em vez de botao quebrado: o visitante descobre o limite antes
 * de esbarrar num 403, e entende que o limite e da vitrine, nao do projeto.
 */
export function AvisoDemonstracao() {
  const ehVisitante = useEhVisitante();
  const { modoDemonstracao } = useAmbiente();

  // Visitante primeiro: para ele, o que importa nao e a regra da vitrine, e
  // que o estudo que ele registrar precisa de uma conta para existir.
  if (ehVisitante) {
    return (
      <p className="aviso-demo" role="status">
        <strong>Você está vendo uma demonstração.</strong> Os editais e as horas abaixo são de
        exemplo. <Link to="/entrar">Entre com o GitHub</Link> para ter os seus — e registrar o seu
        estudo.
      </p>
    );
  }

  if (!modoDemonstracao) {
    return null;
  }

  return (
    <p className="aviso-demo" role="status">
      <strong>Demonstração pública.</strong> Registre e exclua sessões à vontade — os dados são de
      exemplo. Apagar editais está desativado para a vitrine não ser zerada.
    </p>
  );
}
