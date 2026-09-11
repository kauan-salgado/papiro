import { Suspense, lazy } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Carregando } from '../components/ui/Carregando.js';
import { EstadoVazio } from '../components/ui/EstadoVazio.js';
import { Selo } from '../components/ui/Selo.js';
import { BarraDesempenho } from '../components/ui/BarraDesempenho.js';
import { useDesempenhoPorDisciplina, useDesempenhoPorTopico } from '../hooks/useDashboard.js';
import {
  faixaDeDesempenho,
  formatarDataCurta,
  formatarDuracao,
  formatarPercentual,
  totalDeQuestoes,
} from '../lib/formatar.js';
import './paginas.css';

// Recharts entra em um chunk separado: quem so registra sessao nunca o baixa.
const Graficos = {
  Tempo: lazy(async () => ({
    default: (await import('../components/dashboard/Graficos.js')).GraficoTempoPorDisciplina,
  })),
  Ranking: lazy(async () => ({
    default: (await import('../components/dashboard/Graficos.js')).GraficoRankingTopicos,
  })),
};

export function PaginaDesempenho() {
  const { cargoId = '0', disciplinaId } = useParams();
  const cargo = Number(cargoId);

  const { data: disciplinas, isPending } = useDesempenhoPorDisciplina(cargo);
  const { data: topicos } = useDesempenhoPorTopico(disciplinaId ? Number(disciplinaId) : null);

  if (isPending) {
    return <Carregando linhas={5} rotulo="Carregando desempenho" />;
  }

  if (!disciplinas || disciplinas.length === 0) {
    return (
      <EstadoVazio
        titulo="Ainda não há o que medir"
        descricao="Registre sessões no edital verticalizado e os números aparecem aqui."
      />
    );
  }

  const disciplinaSelecionada = disciplinas.find(
    (linha) => linha.disciplinaId === Number(disciplinaId),
  );

  return (
    <>
      <section className="secao" aria-labelledby="macro-titulo">
        <header className="secao__cabecalho">
          <h2 id="macro-titulo" className="secao__titulo">
            Visão macro
          </h2>
          <p className="secao__subtitulo">
            Disciplinas do pior para o melhor percentual de acerto. Quem está no topo da lista
            precisa de você antes das outras.
          </p>
        </header>

        <ol className="ranking">
          {disciplinas.map((linha, indice) => (
            <li key={linha.disciplinaId} className="ranking__item">
              <span className="ranking__posicao">{String(indice + 1).padStart(2, '0')}</span>

              <div className="ranking__corpo">
                <Link
                  to={`/cargos/${cargo}/dashboard/${linha.disciplinaId}`}
                  className="ranking__nome"
                >
                  {linha.disciplina}
                </Link>
                <BarraDesempenho percentual={linha.percentualAcerto} rotulo={linha.disciplina} />
                <p className="ranking__detalhe">
                  {formatarDuracao(linha.totalMinutos)} · {linha.totalSessoes} sessões ·{' '}
                  {totalDeQuestoes(linha)} questões
                </p>
              </div>

              <Selo faixa={faixaDeDesempenho(linha.percentualAcerto)}>
                {formatarPercentual(linha.percentualAcerto)}
              </Selo>
            </li>
          ))}
        </ol>

        <figure className="grafico">
          <figcaption className="grafico__titulo">Tempo investido por disciplina</figcaption>
          <Suspense fallback={<Carregando linhas={4} rotulo="Carregando gráfico" />}>
            <Graficos.Tempo disciplinas={disciplinas} />
          </Suspense>
        </figure>
      </section>

      <section className="secao" aria-labelledby="micro-titulo">
        <header className="secao__cabecalho">
          <h2 id="micro-titulo" className="secao__titulo">
            Visão micro
          </h2>
          <p className="secao__subtitulo">
            {disciplinaSelecionada
              ? `Tópicos de ${disciplinaSelecionada.disciplina}, em ordem de prioridade de revisão.`
              : 'Escolha uma disciplina acima para ver o ranking de tópicos.'}
          </p>
        </header>

        {!disciplinaSelecionada && (
          <EstadoVazio
            titulo="Nenhuma disciplina selecionada"
            descricao="Clique no nome de uma disciplina na visão macro."
          />
        )}

        {disciplinaSelecionada && topicos && (
          <>
            <figure className="grafico">
              <figcaption className="grafico__titulo">
                Percentual de acerto por tópico — do pior para o melhor
              </figcaption>
              <Suspense fallback={<Carregando linhas={5} rotulo="Carregando gráfico" />}>
                <Graficos.Ranking topicos={topicos} />
              </Suspense>
            </figure>

            <ol className="ranking ranking--compacto">
              {topicos.map((topico) => (
                <li key={topico.topicoId} className="ranking__item">
                  <span className="ranking__posicao">{topico.codigoEdital ?? '—'}</span>

                  <div className="ranking__corpo">
                    <Link
                      to={`/cargos/${cargo}/edital?topico=${topico.topicoId}`}
                      className="ranking__nome ranking__nome--topico"
                    >
                      {topico.topico}
                    </Link>
                    <p className="ranking__detalhe">
                      {formatarDuracao(topico.totalMinutos)} · {totalDeQuestoes(topico)} questões ·
                      último estudo {formatarDataCurta(topico.ultimoEstudo)}
                    </p>
                  </div>

                  <Selo faixa={faixaDeDesempenho(topico.percentualAcerto)}>
                    {formatarPercentual(topico.percentualAcerto)}
                  </Selo>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </>
  );
}
