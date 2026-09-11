import { useEhVisitante } from '../../hooks/useAmbiente.js';
import { useExcluirSessao, useSessoesDoAlvo, type Alvo } from '../../hooks/useSessoes.js';
import { formatarData, formatarDuracao } from '../../lib/formatar.js';
import { ROTULO_TIPO_ESTUDO, type Sessao } from '../../types/api.js';
import { Botao } from '../ui/Botao.js';
import { Carregando } from '../ui/Carregando.js';
import './sessao.css';

type Props = {
  readonly alvo: Alvo;
  readonly cargoId: number;
  /** Texto do estado vazio: muda conforme o nivel. */
  readonly textoVazio?: string;
};

function resultado(sessao: Sessao): string | null {
  if (sessao.tipoEstudo !== 'Questoes' || sessao.questoesAcertadas === null) {
    return null;
  }

  const total =
    sessao.questoesAcertadas + (sessao.questoesErradas ?? 0) + (sessao.questoesBrancas ?? 0);

  return `${sessao.questoesAcertadas}/${total} questões`;
}

export function HistoricoSessoes({ alvo, cargoId, textoVazio }: Props) {
  const { data: sessoes, isPending } = useSessoesDoAlvo(alvo);
  const excluir = useExcluirSessao(cargoId, alvo);
  const ehVisitante = useEhVisitante();

  if (isPending) {
    return <Carregando linhas={2} rotulo="Carregando histórico" />;
  }

  if (!sessoes || sessoes.length === 0) {
    return (
      <p className="historico__vazio">
        {textoVazio ?? 'Nenhuma sessão registrada neste tópico ainda.'}
      </p>
    );
  }

  return (
    <div className="historico">
      <h3 className="historico__titulo">
        Histórico <span className="historico__contagem">{sessoes.length}</span>
      </h3>

      <ul className="historico__lista">
        {sessoes.map((sessao) => (
          <li key={sessao.id} className="historico__item">
            <time className="historico__data" dateTime={sessao.data}>
              {formatarData(sessao.data)}
            </time>

            <span className="historico__tipo">{ROTULO_TIPO_ESTUDO[sessao.tipoEstudo]}</span>

            <span className="historico__tempo">{formatarDuracao(sessao.tempoMinutos)}</span>

            <span className="historico__resultado">{resultado(sessao) ?? ''}</span>

            {sessao.simulado && (
              <span className="historico__simulado" title="Sessão parte de um simulado">
                {sessao.simulado.nome}
              </span>
            )}

            {sessao.observacoes && (
              <span className="historico__observacao">{sessao.observacoes}</span>
            )}

            {!ehVisitante && (
              <Botao
                variante="perigo"
                type="button"
                onClick={() => excluir.mutate(sessao.id)}
                disabled={excluir.isPending}
                aria-label={`Excluir sessão de ${formatarData(sessao.data)}`}
              >
                excluir
              </Botao>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
