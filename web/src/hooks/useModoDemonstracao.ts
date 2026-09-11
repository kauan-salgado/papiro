import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Saude = {
  readonly status: string;
  readonly modoDemonstracao: boolean;
};

/**
 * Pergunta ao backend se esta rodando como vitrine publica. Quem decide e o
 * servidor, nao o build do front: o mesmo pacote estatico serve para a maquina
 * de casa e para o ambiente hospedado.
 */
export function useModoDemonstracao(): boolean {
  const { data } = useQuery({
    queryKey: ['saude'] as const,
    queryFn: () => api.get<Saude>('/health'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return data?.modoDemonstracao ?? false;
}
