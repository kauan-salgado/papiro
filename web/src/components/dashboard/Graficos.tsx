import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CONSULTA_COMPACTO, useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatarDuracao, formatarPercentual } from '../../lib/formatar.js';
import type { DesempenhoDisciplina, DesempenhoTopico } from '../../types/api.js';
import { CORES, corPorDesempenho } from './paleta.js';

/**
 * Modulo carregado sob demanda (React.lazy na pagina de desempenho): o Recharts
 * sozinho pesa mais que todo o resto do bundle, e quem esta registrando sessao
 * no edital nao precisa baixa-lo.
 */

const EIXO = {
  tick: { fill: CORES.tintaSuave, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
  axisLine: { stroke: CORES.regua },
  tickLine: false,
} as const;

const ESTILO_TOOLTIP = {
  backgroundColor: CORES.papelFundo,
  border: `1px solid ${CORES.regua}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  color: CORES.tinta,
} as const;

/**
 * Barras sem animacao de entrada, de proposito. O Recharts anima o path via
 * requestAnimationFrame, que o navegador congela em aba de segundo plano — a
 * barra fica parada no primeiro quadro e o grafico aparece vazio. Alem disso,
 * animar largura de barra nao informa nada: o valor ja esta escrito ao lado.
 */
const SEM_ANIMACAO = { isAnimationActive: false } as const;

function encurtar(texto: string, limite = 28): string {
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

type PropsTempo = { readonly disciplinas: readonly DesempenhoDisciplina[] };

/** Tempo investido por disciplina — barras horizontais, rotulo legivel. */
export function GraficoTempoPorDisciplina({ disciplinas }: PropsTempo) {
  // Em tela estreita o eixo de rotulos comeria a barra: 210px de nome sobre um
  // grafico de 309px deixava 40px para o dado. Rotulo curto, eixo estreito.
  const compacto = useMediaQuery(CONSULTA_COMPACTO);

  const dados = [...disciplinas]
    .sort((a, b) => b.totalMinutos - a.totalMinutos)
    .map((linha) => ({
      nome: encurtar(linha.disciplina, compacto ? 16 : 28),
      minutos: linha.totalMinutos,
      percentual: linha.percentualAcerto,
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 34)}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ left: 8, right: compacto ? 16 : 48, top: 4, bottom: 4 }}
      >
        <XAxis type="number" {...EIXO} tickFormatter={(valor: number) => formatarDuracao(valor)} />
        <YAxis type="category" dataKey="nome" width={compacto ? 112 : 210} {...EIXO} />
        <Tooltip
          cursor={{ fill: 'oklch(94.5% 0.016 85)' }}
          contentStyle={ESTILO_TOOLTIP}
          formatter={(valor) => [formatarDuracao(Number(valor ?? 0)), 'Tempo investido']}
        />
        <Bar
          dataKey="minutos"
          fill={CORES.acento}
          radius={[0, 2, 2, 0]}
          maxBarSize={18}
          {...SEM_ANIMACAO}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

type PropsRanking = { readonly topicos: readonly DesempenhoTopico[] };

/**
 * Ranking de topicos por percentual de acerto, do pior para o melhor — a lista
 * e literalmente a ordem de prioridade de revisao. Topicos sem questoes
 * resolvidas ficam fora: eles nao estao ruins, so nao foram medidos.
 */
export function GraficoRankingTopicos({ topicos }: PropsRanking) {
  // Em tela estreita o eixo mostra so o codigo do edital ("4.4"): o texto
  // completo do item ja esta na lista logo abaixo do grafico.
  const compacto = useMediaQuery(CONSULTA_COMPACTO);

  const dados = topicos
    .filter((topico) => topico.percentualAcerto !== null)
    .map((topico) => ({
      nome: compacto
        ? (topico.codigoEdital ?? '—')
        : `${topico.codigoEdital ?? ''} ${encurtar(topico.topico, 34)}`.trim(),
      percentual: topico.percentualAcerto ?? 0,
    }));

  if (dados.length === 0) {
    return (
      <p className="grafico__vazio">
        Nenhum tópico desta disciplina tem questões resolvidas ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, dados.length * 30)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} unit="%" {...EIXO} />
        <YAxis type="category" dataKey="nome" width={compacto ? 48 : 280} {...EIXO} />
        <Tooltip
          cursor={{ fill: 'oklch(94.5% 0.016 85)' }}
          contentStyle={ESTILO_TOOLTIP}
          formatter={(valor) => [formatarPercentual(Number(valor ?? 0)), 'Acerto']}
        />
        <Bar dataKey="percentual" radius={[0, 2, 2, 0]} maxBarSize={16} {...SEM_ANIMACAO}>
          {dados.map((linha) => (
            <Cell key={linha.nome} fill={corPorDesempenho(linha.percentual)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
