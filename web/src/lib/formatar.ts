const MINUTOS_POR_HORA = 60;

/**
 * O banco guarda minutos inteiros; a conversao para horas e responsabilidade
 * exclusiva da apresentacao. E este arquivo e a apresentacao.
 */
export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) {
    return '—';
  }

  const horas = Math.floor(minutos / MINUTOS_POR_HORA);
  const resto = minutos % MINUTOS_POR_HORA;

  if (horas === 0) {
    return `${resto}min`;
  }

  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

export function formatarPercentual(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1).replace('.', ',')}%`;
}

export function formatarData(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataCurta(iso: string | null): string {
  if (!iso) {
    return 'nunca';
  }

  const [, mes, dia] = iso.split('-') as [string, string, string];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  return `${Number(dia)} ${MESES[Number(mes) - 1]}`;
}

export function totalDeQuestoes(linha: {
  acertos: number;
  erros: number;
  brancos: number;
}): number {
  return linha.acertos + linha.erros + linha.brancos;
}

/** Faixas usadas para colorir percentual de acerto no dashboard e no edital. */
export function faixaDeDesempenho(percentual: number | null): 'sem-dados' | 'critico' | 'atencao' | 'bom' {
  if (percentual === null) {
    return 'sem-dados';
  }

  if (percentual < 60) {
    return 'critico';
  }

  return percentual < 75 ? 'atencao' : 'bom';
}
