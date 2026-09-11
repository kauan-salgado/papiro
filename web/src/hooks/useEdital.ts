import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Cargo, Edital } from '../types/api.js';

export const chavesEdital = {
  cargos: ['cargos'] as const,
  edital: (cargoId: number) => ['edital', cargoId] as const,
};

export function useCargos() {
  return useQuery({
    queryKey: chavesEdital.cargos,
    queryFn: () => api.get<Cargo[]>('/cargos'),
  });
}

export function useEdital(cargoId: number) {
  return useQuery({
    queryKey: chavesEdital.edital(cargoId),
    queryFn: () => api.get<Edital>(`/cargos/${cargoId}/edital`),
    enabled: Number.isFinite(cargoId) && cargoId > 0,
  });
}
