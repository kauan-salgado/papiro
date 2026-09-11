import { describe, expect, test } from 'vitest';
import {
  faixaDeDesempenho,
  formatarData,
  formatarDataCurta,
  formatarDuracao,
  formatarPercentual,
  totalDeQuestoes,
} from './formatar.js';

/**
 * O banco guarda minutos inteiros e a conversao para horas e responsabilidade
 * exclusiva desta camada. Se estes testes quebrarem, e porque alguem comecou a
 * formatar em outro lugar.
 */
describe('formatarDuracao', () => {
  test.each([
    [45, '45min'],
    [60, '1h'],
    [90, '1h 30min'],
    [1450, '24h 10min'],
  ])('%i minutos vira "%s"', (minutos, esperado) => {
    expect(formatarDuracao(minutos)).toBe(esperado);
  });

  test('zero minuto nao e duracao, e ausencia de dado', () => {
    expect(formatarDuracao(0)).toBe('—');
  });
});

describe('formatarPercentual', () => {
  test('usa virgula decimal, como se escreve em portugues', () => {
    expect(formatarPercentual(67.55)).toBe('67,5%');
  });

  test('nulo vira travessao: sem questao resolvida nao ha percentual', () => {
    expect(formatarPercentual(null)).toBe('—');
  });

  test('zero e um resultado, nao ausencia', () => {
    expect(formatarPercentual(0)).toBe('0,0%');
  });
});

describe('formatarData', () => {
  test('converte ISO para o formato brasileiro sem passar por Date', () => {
    // Passar por new Date() traria fuso de volta ao problema; a funcao so
    // reordena a string.
    expect(formatarData('2026-09-10')).toBe('10/09/2026');
  });

  test('data ausente vira travessao', () => {
    expect(formatarData(null)).toBe('—');
  });
});

describe('formatarDataCurta', () => {
  test('abrevia o mes', () => {
    expect(formatarDataCurta('2026-09-10')).toBe('10 set');
  });

  test('sem data, diz "nunca" em vez de esconder', () => {
    expect(formatarDataCurta(null)).toBe('nunca');
  });
});

describe('faixaDeDesempenho', () => {
  test.each([
    [null, 'sem-dados'],
    [0, 'critico'],
    [59.9, 'critico'],
    [60, 'atencao'],
    [74.9, 'atencao'],
    [75, 'bom'],
    [100, 'bom'],
  ])('%s cai na faixa %s', (percentual, esperado) => {
    expect(faixaDeDesempenho(percentual)).toBe(esperado);
  });
});

describe('totalDeQuestoes', () => {
  test('soma acertos, erros e brancos', () => {
    expect(totalDeQuestoes({ acertos: 12, erros: 3, brancos: 1 })).toBe(16);
  });
});
