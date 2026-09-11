import { Link } from 'react-router-dom';
import { formatarDuracao, faixaDeDesempenho, formatarPercentual } from '../../lib/formatar.js';
import type { DisciplinaDoEdital } from '../../types/api.js';
import { BarraDesempenho } from '../ui/BarraDesempenho.js';
import { Selo } from '../ui/Selo.js';
import { TopicoLinha } from './TopicoLinha.js';
import './edital.css';

type Props = {
  readonly disciplina: DisciplinaDoEdital;
  readonly cargoId: number;
  readonly topicoAberto: number | null;
  readonly aoAlternarTopico: (topicoId: number) => void;
};

export function DisciplinaGrupo({ disciplina, cargoId, topicoAberto, aoAlternarTopico }: Props) {
  const tituloId = `disciplina-${disciplina.disciplinaId}`;

  return (
    <section className="disciplina" aria-labelledby={tituloId}>
      <header className="disciplina__cabecalho">
        <div className="disciplina__identificacao">
          <h2 id={tituloId} className="disciplina__nome">
            {disciplina.disciplina}
          </h2>
          <p className="disciplina__resumo">
            {disciplina.topicos.length} tópicos · {formatarDuracao(disciplina.totalMinutos)}
            {disciplina.peso !== null && disciplina.peso !== 1 && ` · peso ${disciplina.peso}`}
          </p>
        </div>

        <div className="disciplina__desempenho">
          <Selo faixa={faixaDeDesempenho(disciplina.percentualAcerto)}>
            {formatarPercentual(disciplina.percentualAcerto)}
          </Selo>
          <Link
            className="disciplina__link"
            to={`/cargos/${cargoId}/dashboard/${disciplina.disciplinaId}`}
          >
            ver ranking
          </Link>
        </div>
      </header>

      <BarraDesempenho percentual={disciplina.percentualAcerto} rotulo={disciplina.disciplina} />

      <ol className="disciplina__topicos">
        {disciplina.topicos.map((topico) => (
          <TopicoLinha
            key={topico.topicoId}
            topico={topico}
            cargoId={cargoId}
            aberto={topicoAberto === topico.topicoId}
            aoAlternar={aoAlternarTopico}
          />
        ))}
      </ol>
    </section>
  );
}
