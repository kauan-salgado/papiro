import { faixaDeDesempenho, formatarPercentual } from '../../lib/formatar.js';
import './ui.css';

type Props = {
  readonly percentual: number | null;
  readonly rotulo?: string;
};

/**
 * Barra de percentual de acerto. Largura via transform: scaleX para a animacao
 * ficar no compositor — animar `width` custaria layout a cada quadro.
 */
export function BarraDesempenho({ percentual, rotulo }: Props) {
  const faixa = faixaDeDesempenho(percentual);

  return (
    <div
      className="barra-desempenho"
      data-faixa={faixa}
      role="img"
      aria-label={`${rotulo ? `${rotulo}: ` : ''}${formatarPercentual(percentual)} de acerto`}
    >
      <span
        className="barra-desempenho__preenchimento"
        style={{ transform: `scaleX(${(percentual ?? 0) / 100})` }}
      />
    </div>
  );
}
