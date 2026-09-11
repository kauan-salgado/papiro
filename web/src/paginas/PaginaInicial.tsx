import { Link } from 'react-router-dom';
import { useCargos } from '../hooks/useEdital.js';
import { useCarregarExemplos } from '../hooks/useExemplos.js';
import { useEhVisitante } from '../hooks/useAmbiente.js';
import { Botao } from '../components/ui/Botao.js';
import { Carregando } from '../components/ui/Carregando.js';
import { EstadoVazio } from '../components/ui/EstadoVazio.js';
import './paginas.css';

export function PaginaInicial() {
  const { data: cargos, isPending, isError } = useCargos();
  const exemplos = useCarregarExemplos();
  const ehVisitante = useEhVisitante();

  if (isPending) {
    return <Carregando linhas={4} rotulo="Carregando editais" />;
  }

  if (isError || !cargos) {
    return (
      <EstadoVazio
        titulo="Não foi possível falar com a API"
        descricao="Confira se os containers estão de pé: docker compose up -d"
      />
    );
  }

  if (cargos.length === 0) {
    return (
      <EstadoVazio
        titulo="Sua conta está vazia"
        descricao="Cadastre um edital e cole o texto do PDF, ou carregue dois editais de exemplo com histórico de estudo para ver como o Papiro funciona."
        acao={
          <div className="estado-vazio__acoes">
            <Botao
              type="button"
              onClick={() => exemplos.mutate()}
              disabled={exemplos.isPending}
            >
              {exemplos.isPending ? 'Carregando…' : 'Carregar editais de exemplo'}
            </Botao>
            <Link to="/novo" className="cartao__acao cartao__acao--sutil">
              Cadastrar o meu edital
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <>
      <section className="abertura">
        <p className="abertura__sobrenome">Edital verticalizado &amp; métricas de estudo</p>
        <h2 className="abertura__titulo">
          Um edital por concurso.<br />
          Um tópico por linha.<br />
          Uma sessão por registro.
        </h2>
        <p className="abertura__texto">
          Todo número que você vê é soma de sessões registradas — nunca um contador que alguém
          incrementou e esqueceu de corrigir.
        </p>
      </section>

      <div className="abertura__acao">
        {ehVisitante ? (
          <Link to="/entrar" className="cartao__acao">
            Entrar para criar o meu edital
          </Link>
        ) : (
          <Link to="/novo" className="cartao__acao">
            + Novo edital
          </Link>
        )}
      </div>

      <ul className="cartoes">
        {cargos.map((cargo) => (
          <li key={cargo.id} className="cartao">
            <p className="cartao__banca">{cargo.concurso.banca ?? 'banca não informada'}</p>
            <h3 className="cartao__concurso">{cargo.concurso.nome}</h3>
            <p className="cartao__cargo">{cargo.nome}</p>

            <p className="cartao__numeros">
              <span>{cargo._count.disciplinas} disciplinas</span>
              <span>{cargo._count.simulados} simulados</span>
            </p>

            <div className="cartao__acoes">
              <Link className="cartao__acao" to={`/cargos/${cargo.id}/edital`}>
                Abrir edital
              </Link>
              <Link className="cartao__acao cartao__acao--sutil" to={`/cargos/${cargo.id}/dashboard`}>
                Ver desempenho
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
