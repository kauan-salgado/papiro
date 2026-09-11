import { useSyncExternalStore } from 'react';

/**
 * Media query como estado do React. Usado pelos graficos, que precisam de
 * largura de eixo em numero — CSS sozinho nao resolve o layout do SVG.
 */
export function useMediaQuery(consulta: string): boolean {
  return useSyncExternalStore(
    (aoMudar) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener('change', aoMudar);
      return () => lista.removeEventListener('change', aoMudar);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}

export const CONSULTA_COMPACTO = '(max-width: 720px)';
