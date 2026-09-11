import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { chavesDashboard } from './useDashboard.js';
import { chavesEdital } from './useEdital.js';

/**
 * Apaga o edital pelo cargo. O backend remove o concurso junto quando aquele
 * era o unico cargo dele — concurso sem cargo nao aparece em lugar nenhum.
 */
export function useExcluirEdital() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cargoId: number) => api.remover(`/cargos/${cargoId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesEdital.cargos }),
        queryClient.invalidateQueries({ queryKey: chavesDashboard.raiz }),
      ]);
    },
  });
}
