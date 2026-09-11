import { Link, NavLink, useMatch, useNavigate } from 'react-router-dom';
import { useCargos } from '../../hooks/useEdital.js';
import './layout.css';

/**
 * Cabecalho persistente. O seletor de cargo troca de edital sem sair da tela
 * atual — estudar para dois concursos em paralelo e o caso de uso central, e
 * nao pode custar tres cliques.
 */
export function Cabecalho() {
  const correspondencia = useMatch('/cargos/:cargoId/*');
  const cargoIdAtual = Number(correspondencia?.params.cargoId ?? 0);
  const secaoAtual = correspondencia?.params['*']?.split('/')[0] ?? 'edital';

  const { data: cargos = [] } = useCargos();
  const navegar = useNavigate();
  const cargo = cargos.find((item) => item.id === cargoIdAtual);

  return (
    <header className="cabecalho-app">
      <div className="cabecalho-app__topo">
        <Link to="/" className="cabecalho-app__marca">
          Papiro
        </Link>

        {cargos.length > 0 && (
          <label className="cabecalho-app__seletor">
            <span className="visualmente-oculto">Concurso e cargo</span>
            <select
              value={cargoIdAtual || ''}
              onChange={(evento) => navegar(`/cargos/${evento.target.value}/${secaoAtual}`)}
            >
              <option value="" disabled>
                Escolha um edital
              </option>
              {cargos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.concurso.nome} — {item.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {cargo && (
        <div className="cabecalho-app__contexto">
          <div>
            <p className="cabecalho-app__concurso">
              {cargo.concurso.nome}
              {cargo.concurso.banca && <span> · {cargo.concurso.banca}</span>}
            </p>
            <h1 className="cabecalho-app__cargo">{cargo.nome}</h1>
          </div>

          <nav className="abas" aria-label="Seções do edital">
            <NavLink to={`/cargos/${cargo.id}/edital`} className="abas__aba">
              Edital verticalizado
            </NavLink>
            <NavLink to={`/cargos/${cargo.id}/dashboard`} className="abas__aba" end={false}>
              Desempenho
            </NavLink>
            <NavLink to={`/cargos/${cargo.id}/importar`} className="abas__aba">
              Importar
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
}
