import { Link } from 'react-router-dom';
import { formatarDuracao, faixaDeDesempenho, formatarPercentual } from '../../lib/formatar.js';
import type { DisciplinaDoEdital } from '../../types/api.js';
import { BarraDesempenho } from '../ui/BarraDesempenho.js';
import { Selo } from '../ui/Selo.js';
import { PainelDeRegistro } from './PainelDeRegistro.js';
import { TopicoLinha } from './TopicoLinha.js';
import './edital.css';

type Props = {
  readonly disciplina: DisciplinaDoEdital;
  readonly cargoId: number;
  readonly topicoAberto: number | null;
  readonly aoAlternarTopico: (topicoId: number) => void;
  readonly disciplinaAberta: boolean;
  readonly aoAlternarDisciplina: (disciplinaId: number) => void;
};

export function DisciplinaGrupo({
  disciplina,
  cargoId,
  topicoAberto,
  aoAlternarTopico,
  disciplinaAberta,
  aoAlternarDisciplina,
}: Props) {
  const tituloId = `disciplina-${disciplina.disciplinaId}`;
  const painelId = `painel-disciplina-${disciplina.disciplinaId}`;

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
          {/* Bateria avulsa da materia: estudo que nao cabe em item nenhum. */}
          <button
            type="button"
            className="disciplina__registrar"
            aria-expanded={disciplinaAberta}
            aria-controls={painelId}
            onClick={() => aoAlternarDisciplina(disciplina.disciplinaId)}
          >
            {disciplinaAberta ? 'fechar' : 'registrar na matéria'}
          </button>

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

      {disciplinaAberta && (
        <div className="disciplina__painel" id={painelId}>
          <p className="disciplina__explicacao">
            Estudo de <strong>{disciplina.disciplina}</strong> que não pertence a um item
            específico — uma bateria de questões avulsas, por exemplo. Entra nas estatísticas da
            matéria, junto com os itens.
          </p>
          <PainelDeRegistro
            alvo={{ tipo: 'disciplina', id: disciplina.disciplinaId }}
            cargoId={cargoId}
            convite="Aqui entra o estudo da matéria que não cabe em um item do edital."
            textoVazio="Nenhuma sessão avulsa nesta matéria ainda."
          />
        </div>
      )}

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
