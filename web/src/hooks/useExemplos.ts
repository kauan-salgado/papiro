import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { chavesEdital } from './useEdital.js';

export type ResultadoExemplos = {
  readonly concursosCriados: number;
  readonly topicosCriados: number;
  readonly sessoesCriadas: number;
  readonly jaExistiam: number;
};

/** Copia os editais de exemplo para a conta de quem clicou. */
export function useCarregarExemplos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<ResultadoExemplos>('/exemplos', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chavesEdital.cargos }),
  });
}
