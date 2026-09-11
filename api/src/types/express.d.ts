import type { UsuarioAutenticado } from '../modules/auth/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware de autenticacao quando ha sessao valida. */
      usuario?: UsuarioAutenticado;
      /** true quando a identidade veio da vitrine publica, e nao de um login. */
      visitante?: boolean;
    }
  }
}

export {};
