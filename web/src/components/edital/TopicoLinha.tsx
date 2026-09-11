import { PainelDeRegistro } from './PainelDeRegistro.js';
import { formatarDataCurta, formatarDuracao, faixaDeDesempenho, formatarPercentual } from '../../lib/formatar.js';
import type { DesempenhoTopico } from '../../types/api.js';
import { Selo } from '../ui/Selo.js';
import './edital.css';

type Props = {
  readonly topico: DesempenhoTopico;
  readonly cargoId: number;
  readonly aberto: boolean;
  readonly aoAlternar: (topicoId: number) => void;
};

/**
 * Uma linha do edital. Clicar expande o painel de registro NO LUGAR — sem
 * navegar: quem esta varrendo o edital nao quer perder a posicao da lista para
 * anotar 40 minutos de estudo.
 */
export function TopicoLinha({ topico, cargoId, aberto, aoAlternar }: Props) {
  const painelId = `painel-topico-${topico.topicoId}`;
  const estudado = topico.totalSessoes > 0;

  return (
    <li className="topico" data-aberto={aberto} data-estudado={estudado}>
      <button
        type="button"
        className="topico__gatilho"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => aoAlternar(topico.topicoId)}
      >
        <span className="topico__codigo">{topico.codigoEdital ?? '—'}</span>

        <span className="topico__descricao">{topico.topico}</span>

        <span className="topico__metricas">
          {estudado ? (
            <>
              <span className="topico__tempo">{formatarDuracao(topico.totalMinutos)}</span>
              <Selo
                faixa={faixaDeDesempenho(topico.percentualAcerto)}
                titulo={`${topico.acertos} acertos de ${topico.acertos + topico.erros + topico.brancos} questões`}
              >
                {formatarPercentual(topico.percentualAcerto)}
              </Selo>
              <span className="topico__ultimo">{formatarDataCurta(topico.ultimoEstudo)}</span>
            </>
          ) : (
            <span className="topico__nunca">não estudado</span>
          )}
        </span>
      </button>

      {aberto && (
        <div className="topico__painel" id={painelId}>
          <PainelDeRegistro
            alvo={{ tipo: 'topico', id: topico.topicoId }}
            cargoId={cargoId}
            convite="Este é o painel onde cada sessão de estudo é registrada."
            textoVazio="Nenhuma sessão registrada neste tópico ainda."
          />
        </div>
      )}
    </li>
  );
}
