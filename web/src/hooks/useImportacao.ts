import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { ItemAnalisado } from '../lib/parser-edital.js';
import type { Cargo, Concurso } from '../types/api.js';
import { chavesEdital } from './useEdital.js';
import { chavesDashboard } from './useDashboard.js';

export type NovoEdital = {
  readonly concurso: string;
  readonly banca?: string;
  readonly dataProva?: string;
  readonly cargo: string;
};

export type ResultadoImportacao = {
  readonly disciplinasCriadas: number;
  readonly topicosCriados: number;
  readonly topicosIgnorados: number;
};

/**
 * Cria concurso e cargo em sequencia. Nao ha endpoint unico para os dois: o
 * cargo depende do id do concurso, e inventar uma rota "criar tudo" so para
 * economizar uma requisicao acrescentaria uma terceira forma de criar as
 * mesmas entidades.
 */
export function useCriarEdital() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: NovoEdital): Promise<Cargo> => {
      const concurso = await api.post<Concurso>('/concursos', {
        nome: dados.concurso,
        banca: dados.banca?.trim() ? dados.banca.trim() : null,
        dataProva: dados.dataProva?.trim() ? dados.dataProva : null,
      });

      return api.post<Cargo>('/cargos', { concursoId: concurso.id, nome: dados.cargo });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chavesEdital.cargos }),
  });
}

export function useImportarEdital(cargoId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entrada: {
      itens: readonly ItemAnalisado[];
      substituir: boolean;
      pesos?: Record<string, number>;
    }) =>
      api.post<ResultadoImportacao>(`/cargos/${cargoId}/edital/importar`, {
        itens: entrada.itens,
        substituir: entrada.substituir,
        ...(entrada.pesos && { pesos: entrada.pesos }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chavesEdital.edital(cargoId) }),
        queryClient.invalidateQueries({ queryKey: chavesEdital.cargos }),
        queryClient.invalidateQueries({ queryKey: chavesDashboard.raiz }),
      ]);
    },
  });
}
