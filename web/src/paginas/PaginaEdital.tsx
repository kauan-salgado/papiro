import { useParams, useSearchParams } from 'react-router-dom';
import { DisciplinaGrupo } from '../components/edital/DisciplinaGrupo.js';
import { LinhaSimulado } from '../components/edital/LinhaSimulado.js';
import { Carregando } from '../components/ui/Carregando.js';
import { EstadoVazio } from '../components/ui/EstadoVazio.js';
import { useEhVisitante } from '../hooks/useAmbiente.js';
import { useEdital } from '../hooks/useEdital.js';
import { formatarDuracao } from '../lib/formatar.js';
import './paginas.css';

export function PaginaEdital() {
  const { cargoId = '0' } = useParams();
  const [parametros, definirParametros] = useSearchParams();

  const { data: edital, isPending, isError } = useEdital(Number(cargoId));
  const ehVisitante = useEhVisitante();

  const topicoAberto = parametros.has('topico') ? Number(parametros.get('topico')) : null;
  const disciplinaAberta = parametros.has('materia') ? Number(parametros.get('materia')) : null;
  const simuladoAberto = parametros.has('simulado');

  /**
   * O painel aberto vive na URL: recarregar ou compartilhar o link preserva o
   * lugar. Abrir um fecha os outros — dois formularios de registro na tela ao
   * mesmo tempo so criariam duvida sobre onde o estudo vai entrar.
   */
  function abrirPainel(chave: 'topico' | 'materia' | 'simulado', id?: number) {
    const proximos = new URLSearchParams();
    const jaAberto =
      (chave === 'topico' && topicoAberto === id) ||
      (chave === 'materia' && disciplinaAberta === id) ||
      (chave === 'simulado' && simuladoAberto);

    if (!jaAberto) {
      proximos.set(chave, id === undefined ? '1' : String(id));
    }

    definirParametros(proximos, { replace: true });
  }

  if (isPending) {
    return <Carregando linhas={6} rotulo="Carregando edital" />;
  }

  if (isError || !edital) {
    return <EstadoVazio titulo="Edital não encontrado" descricao="Escolha outro edital no seletor acima." />;
  }

  const topicos = edital.disciplinas.flatMap((disciplina) => disciplina.topicos);
  const estudados = topicos.filter((topico) => topico.totalSessoes > 0).length;
  const minutos = edital.disciplinas.reduce((soma, d) => soma + d.totalMinutos, 0);
  const cobertura = topicos.length > 0 ? Math.round((100 * estudados) / topicos.length) : 0;

  return (
    <>
      <section className="resumo-edital" aria-label="Resumo do edital">
        <p className="resumo-edital__item">
          <strong>{topicos.length}</strong> tópicos
        </p>
        <p className="resumo-edital__item">
          <strong>{estudados}</strong> estudados
          <span className="resumo-edital__nota">{cobertura}% do edital</span>
        </p>
        <p className="resumo-edital__item">
          <strong>{formatarDuracao(minutos)}</strong> investidas
        </p>
        <p className="resumo-edital__dica">
          {ehVisitante
            ? 'Clique em um tópico para ver como o registro funciona.'
            : 'Clique em um tópico para registrar uma sessão.'}
        </p>
      </section>

      <LinhaSimulado
        cargoId={Number(cargoId)}
        aberto={simuladoAberto}
        aoAlternar={() => abrirPainel('simulado')}
      />

      {edital.disciplinas.map((disciplina) => (
        <DisciplinaGrupo
          key={disciplina.disciplinaId}
          disciplina={disciplina}
          cargoId={Number(cargoId)}
          topicoAberto={topicoAberto}
          aoAlternarTopico={(id) => abrirPainel('topico', id)}
          disciplinaAberta={disciplinaAberta === disciplina.disciplinaId}
          aoAlternarDisciplina={(id) => abrirPainel('materia', id)}
        />
      ))}
    </>
  );
}
