import { Link } from 'react-router-dom';
import { useEhVisitante } from '../../hooks/useAmbiente.js';
import type { Alvo } from '../../hooks/useSessoes.js';
import { FormularioSessao } from '../sessao/FormularioSessao.js';
import { HistoricoSessoes } from '../sessao/HistoricoSessoes.js';

type Props = {
  readonly alvo: Alvo;
  readonly cargoId: number;
  readonly convite: string;
  readonly textoVazio: string;
};

/**
 * Formulario e historico, para qualquer um dos tres niveis.
 *
 * Extraido de TopicoLinha quando disciplina e cargo passaram a receber estudo:
 * o que muda entre eles e o alvo e a redacao, nao o comportamento.
 */
export function PainelDeRegistro({ alvo, cargoId, convite, textoVazio }: Props) {
  const ehVisitante = useEhVisitante();

  return (
    <>
      {ehVisitante ? (
        <p className="convite">
          {convite} <Link to="/entrar">Entre com o GitHub</Link> para registrar o seu estudo.
        </p>
      ) : (
        <FormularioSessao alvo={alvo} cargoId={cargoId} />
      )}
      <HistoricoSessoes alvo={alvo} cargoId={cargoId} textoVazio={textoVazio} />
    </>
  );
}
