import type { UsuarioAutenticado } from '../modules/auth/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware de autenticacao quando ha sessao valida. */
      usuario?: UsuarioAutenticado;
    }
  }
}

export {};
