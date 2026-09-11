import { ApiStatus } from './components/status/ApiStatus.js';
import './app.css';

const ETAPAS = [
  { id: 1, titulo: 'Infraestrutura', descricao: 'Docker, Postgres 16, Adminer e monorepo', pronto: true },
  { id: 2, titulo: 'Schema e migrations', descricao: 'Prisma fiel ao modelo + seed dos editais reais', pronto: false },
  { id: 3, titulo: 'API', descricao: 'CRUD do edital, sessoes de estudo e dashboards', pronto: false },
  { id: 4, titulo: 'Frontend', descricao: 'Edital verticalizado, formulario inline e graficos', pronto: false },
] as const;

export function App() {
  return (
    <>
      <header className="cabecalho">
        <p className="cabecalho__sobrenome">Edital verticalizado &amp; metricas de estudo</p>
        <h1 className="cabecalho__marca">Papiro</h1>
        <p className="cabecalho__linha-fina">
          Um edital por concurso, um topico por linha, uma sessao por registro. Todo numero
          que voce ve e soma de fatos, nunca de contador.
        </p>
        <ApiStatus />
      </header>

      <main>
        <section className="etapas" aria-labelledby="etapas-titulo">
          <h2 id="etapas-titulo" className="etapas__titulo">
            Construcao
          </h2>
          <ol className="etapas__lista">
            {ETAPAS.map((etapa) => (
              <li key={etapa.id} className="etapa" data-pronto={etapa.pronto}>
                <span className="etapa__numero">{String(etapa.id).padStart(2, '0')}</span>
                <div>
                  <h3 className="etapa__titulo">{etapa.titulo}</h3>
                  <p className="etapa__descricao">{etapa.descricao}</p>
                </div>
                <span className="etapa__selo">{etapa.pronto ? 'pronto' : 'a fazer'}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
