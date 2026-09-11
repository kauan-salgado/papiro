import { useModoDemonstracao } from '../../hooks/useModoDemonstracao.js';
import './layout.css';

/**
 * Aviso honesto em vez de botao quebrado: o visitante descobre o limite antes
 * de esbarrar num 403, e entende que o limite e da vitrine, nao do projeto.
 */
export function AvisoDemonstracao() {
  if (!useModoDemonstracao()) {
    return null;
  }

  return (
    <p className="aviso-demo" role="status">
      <strong>Demonstração pública.</strong> Registre e exclua sessões à vontade — os dados são de
      exemplo. Apagar editais está desativado para a vitrine não ser zerada.
    </p>
  );
}
