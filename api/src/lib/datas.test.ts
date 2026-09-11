import { describe, expect, test } from 'vitest';
import { formatarDataISO, paraDataDoBanco } from './datas.js';

describe('paraDataDoBanco', () => {
  test('ancora a data ao meio-dia UTC para sobreviver a fusos negativos', () => {
    // Arrange / Act
    const data = paraDataDoBanco('2026-09-10');

    // Assert
    expect(data.toISOString()).toBe('2026-09-10T12:00:00.000Z');
  });

  test('mantem o mesmo dia do calendario no fuso de Brasilia', () => {
    const data = paraDataDoBanco('2026-01-01');

    // -03:00 sobre meio-dia UTC ainda cai em 1 de janeiro (09:00 local).
    const diaEmBrasilia = new Date(data.getTime() - 3 * 60 * 60 * 1000).getUTCDate();

    expect(diaEmBrasilia).toBe(1);
  });

  test('preserva a data na ida e na volta', () => {
    expect(formatarDataISO(paraDataDoBanco('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('formatarDataISO', () => {
  test('devolve apenas a parte da data', () => {
    expect(formatarDataISO(new Date('2026-03-05T23:45:00.000Z'))).toBe('2026-03-05');
  });
});
