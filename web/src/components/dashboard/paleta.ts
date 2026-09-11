/**
 * Paleta dos graficos, espelhando os tokens de styles/tokens.css.
 * Recharts precisa de cor resolvida, e nao de var(--...), entao os valores sao
 * repetidos aqui de proposito — se um token mudar, este arquivo muda junto.
 */
export const CORES = {
  tinta: 'oklch(24% 0.02 60)',
  tintaSuave: 'oklch(48% 0.015 60)',
  regua: 'oklch(88% 0.015 80)',
  papelFundo: 'oklch(99.2% 0.006 85)',
  acento: 'oklch(52% 0.15 32)',
  positivo: 'oklch(50% 0.12 145)',
  atencao: 'oklch(55% 0.13 70)',
  negativo: 'oklch(52% 0.18 25)',
  semDados: 'oklch(84% 0.01 60)',
} as const;

export function corPorDesempenho(percentual: number | null): string {
  if (percentual === null) {
    return CORES.semDados;
  }

  if (percentual < 60) {
    return CORES.negativo;
  }

  return percentual < 75 ? CORES.atencao : CORES.positivo;
}
