import { Outlet } from 'react-router-dom';
import { AvisoDemonstracao } from './AvisoDemonstracao.js';
import { Cabecalho } from './Cabecalho.js';
import './layout.css';

export function Layout() {
  return (
    <div className="pagina">
      <Cabecalho />
      <AvisoDemonstracao />
      <main className="pagina__conteudo">
        <Outlet />
      </main>
      <footer className="rodape">
        <p>
          Papiro · dados agregados por views SQL, nunca por contador mutável.
        </p>
      </footer>
    </div>
  );
}
