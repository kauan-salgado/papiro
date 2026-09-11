import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Sessao, Simulado, TipoEstudo } from '../types/api.js';
import { chavesEdital } from './useEdital.js';
import { chavesDashboard } from './useDashboard.js';

/** Onde o estudo entra: um item do edital, a materia inteira, ou a prova. */
export type Alvo =
  | { readonly tipo: 'topico'; readonly id: number }
  | { readonly tipo: 'disciplina'; readonly id: number }
  | { readonly tipo: 'cargo'; readonly id: number };

export type NovaSessao = {
  readonly topicoId?: number;
  readonly disciplinaId?: number;
  readonly cargoId?: number;
  readonly data: string;
  readonly tempoMinutos: number;
  readonly tipoEstudo: TipoEstudo;
  readonly simuladoId?: number | null;
  readonly observacoes?: string | null;
  readonly questoesAcertadas?: number | null;
  readonly questoesErradas?: number | null;
  readonly questoesBrancas?: number | null;
};

const chaveSessoes = (alvo: Alvo) => ['sessoes', alvo.tipo, alvo.id] as const;

/** Caminho do historico de cada nivel. */
function caminhoDoHistorico(alvo: Alvo): string {
  const pasta = { topico: 'topicos', disciplina: 'disciplinas', cargo: 'cargos' }[alvo.tipo];
  return `/${pasta}/${alvo.id}/sessoes`;
}

export function useSessoesDoAlvo(alvo: Alvo | null) {
  return useQuery({
    queryKey: chaveSessoes(alvo ?? { tipo: 'topico', id: 0 }),
    queryFn: () => api.get<Sessao[]>(caminhoDoHistorico(alvo as Alvo)),
    enabled: alvo !== null,
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
function useInvalidarDerivados(cargoId: number, alvo: Alvo) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chaveSessoes(alvo) }),
      queryClient.invalidateQueries({ queryKey: chavesEdital.edital(cargoId) }),
      queryClient.invalidateQueries({ queryKey: chavesDashboard.raiz }),
    ]);
  };
}

export function useRegistrarSessao(cargoId: number, alvo: Alvo) {
  const invalidar = useInvalidarDerivados(cargoId, alvo);

  return useMutation({
    mutationFn: (sessao: NovaSessao) => api.post<Sessao>('/sessoes', sessao),
    onSuccess: invalidar,
  });
}

export function useExcluirSessao(cargoId: number, alvo: Alvo) {
  const invalidar = useInvalidarDerivados(cargoId, alvo);

  return useMutation({
    mutationFn: (sessaoId: number) => api.remover(`/sessoes/${sessaoId}`),
    onSuccess: invalidar,
  });
}
