import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export type Usuario = {
  readonly id: number;
  readonly login: string;
  readonly nome: string | null;
  readonly avatarUrl: string | null;
};

const CHAVE = ['usuario'] as const;

/**
 * Quem esta logado. A rota devolve 200 com `null` para visitante — e nao 401 —
 * porque "nao ha ninguem" e uma resposta, nao um erro: tratar como erro faria
 * o React Query tentar de novo e encheria o console de falhas esperadas.
 */
export function useUsuario() {
  const { data, isPending } = useQuery({
    queryKey: CHAVE,
    queryFn: () => api.get<Usuario | null>('/auth/eu'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return { usuario: data ?? null, carregando: isPending };
}

export function useSair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<void>('/auth/sair', {}),
    onSuccess: async () => {
      // Limpa o cache inteiro: o que estava na tela era do usuario que saiu.
      queryClient.clear();
      window.location.href = '/entrar';
    },
  });
}
