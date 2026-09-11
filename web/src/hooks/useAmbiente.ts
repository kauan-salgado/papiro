import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useUsuario } from './useUsuario.js';

type Saude = {
  readonly status: string;
  readonly modoDemonstracao: boolean;
  readonly vitrinePublica: boolean;
};

/**
 * Como o servidor esta configurado. Quem decide e ele, nao o build do front:
 * o mesmo pacote estatico serve para a maquina de casa e para o ar.
 */
export function useAmbiente() {
  const { data, isPending } = useQuery({
    queryKey: ['saude'] as const,
    queryFn: () => api.get<Saude>('/health'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    modoDemonstracao: data?.modoDemonstracao ?? false,
    vitrinePublica: data?.vitrinePublica ?? false,
    // Quem decide rota precisa saber que ainda nao sabe: enquanto esta
    // consulta nao volta, "vitrine fechada" e chute, nao resposta.
    carregando: isPending,
  };
}

/**
 * Visitante e quem esta vendo a vitrine sem ter entrado. Ele enxerga a conta
 * de demonstracao em modo leitura — tudo que escreve exige login.
 */
export function useEhVisitante(): boolean {
  const { usuario, carregando } = useUsuario();
  const ambiente = useAmbiente();

  return !carregando && !ambiente.carregando && !usuario && ambiente.vitrinePublica;
}
