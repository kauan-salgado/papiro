import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { DesempenhoDisciplina, DesempenhoTopico } from '../types/api.js';

export const chavesDashboard = {
  raiz: ['dashboard'] as const,
  disciplinas: (cargoId: number) => ['dashboard', 'disciplinas', cargoId] as const,
  topicos: (disciplinaId: number) => ['dashboard', 'topicos', disciplinaId] as const,
};

export function useDesempenhoPorDisciplina(cargoId: number) {
  return useQuery({
    queryKey: chavesDashboard.disciplinas(cargoId),
    queryFn: () => api.get<DesempenhoDisciplina[]>(`/dashboard/disciplinas?cargoId=${cargoId}`),
    enabled: cargoId > 0,
  });
}

export function useDesempenhoPorTopico(disciplinaId: number | null) {
  return useQuery({
    queryKey: chavesDashboard.topicos(disciplinaId ?? 0),
    queryFn: () => api.get<DesempenhoTopico[]>(`/dashboard/topicos/${disciplinaId}`),
    enabled: disciplinaId !== null && disciplinaId > 0,
  });
}
