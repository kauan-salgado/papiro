import { useSearchParams } from 'react-router-dom';
import './paginas.css';

const MENSAGENS: Readonly<Record<string, string>> = {
  estado: 'O retorno do GitHub não conferiu. Tente entrar de novo.',
  github: 'Não foi possível falar com o GitHub agora. Tente de novo em instantes.',
};

export function PaginaEntrar() {
  const [parametros] = useSearchParams();
  const erro = parametros.get('erro');

  return (
    <section className="entrar">
      <p className="abertura__sobrenome">Edital verticalizado &amp; métricas de estudo</p>
      <h2 className="entrar__titulo">
        Seu estudo é seu.<br />
        Entre para começar.
      </h2>

      <p className="entrar__texto">
        Cada pessoa vê apenas os próprios editais e as próprias sessões. O Papiro não guarda
        senha: a identificação vem do GitHub, e o único dado que pedimos é o do seu perfil
        público.
      </p>

      {erro && (
        <p className="formulario-sessao__erro" role="alert">
          {MENSAGENS[erro] ?? 'Não foi possível entrar. Tente de novo.'}
        </p>
      )}

      {/* Link de navegação, e não fetch: o fluxo OAuth é uma sequência de redirects. */}
      <a className="entrar__botao" href="/api/auth/github">
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        Entrar com GitHub
      </a>

      <p className="entrar__rodape">
        Ao entrar, criamos uma conta com seu nome de usuário, nome público e foto. Nada além
        disso — e nenhum acesso aos seus repositórios.
      </p>
    </section>
  );
}
