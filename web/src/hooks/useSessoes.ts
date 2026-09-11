import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Sessao, Simulado, TipoEstudo } from '../types/api.js';
import { chavesEdital } from './useEdital.js';
import { chavesDashboard } from './useDashboard.js';

export type NovaSessao = {
  readonly topicoId: number;
  readonly data: string;
  readonly tempoMinutos: number;
  readonly tipoEstudo: TipoEstudo;
  readonly simuladoId?: number | null;
  readonly observacoes?: string | null;
  readonly questoesAcertadas?: number | null;
  readonly questoesErradas?: number | null;
  readonly questoesBrancas?: number | null;
};

const chaveSessoes = (topicoId: number) => ['sessoes', topicoId] as const;

export function useSessoesDoTopico(topicoId: number | null) {
  return useQuery({
    queryKey: chaveSessoes(topicoId ?? 0),
    queryFn: () => api.get<Sessao[]>(`/topicos/${topicoId}/sessoes`),
    enabled: topicoId !== null,
  });
}

export function useSimulados(cargoId: number) {
  return useQuery({
    queryKey: ['simulados', cargoId] as const,
    queryFn: () => api.get<Simulado[]>(`/simulados?cargoId=${cargoId}`),
    enabled: cargoId > 0,
  });
}

/**
 * Depois de gravar ou excluir uma sessao, tres leituras ficam velhas: o
 * historico do topico, o edital (que carrega as metricas de cada linha) e os
 * dashboards. Invalidar as tres e mais honesto do que remendar o cache na mao:
 * os agregados sao SUM no banco, entao o banco e quem sabe o valor novo.
 */
function useInvalidarDerivados(cargoId: number, topicoId: number) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chaveSessoes(topicoId) }),
      queryClient.invalidateQueries({ queryKey: chavesEdital.edital(cargoId) }),
      queryClient.invalidateQueries({ queryKey: chavesDashboard.raiz }),
    ]);
  };
}

export function useRegistrarSessao(cargoId: number, topicoId: number) {
  const invalidar = useInvalidarDerivados(cargoId, topicoId);

  return useMutation({
    mutationFn: (sessao: NovaSessao) => api.post<Sessao>('/sessoes', sessao),
    onSuccess: invalidar,
  });
}

export function useExcluirSessao(cargoId: number, topicoId: number) {
  const invalidar = useInvalidarDerivados(cargoId, topicoId);

  return useMutation({
    mutationFn: (sessaoId: number) => api.remover(`/sessoes/${sessaoId}`),
    onSuccess: invalidar,
  });
}
