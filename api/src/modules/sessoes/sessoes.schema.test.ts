import { describe, expect, test } from 'vitest';
import { criarSessaoSchema } from './sessoes.schema.js';

const base = { topicoId: 1, tempoMinutos: 45 };

/**
 * A regra condicional das questoes e a regra mais importante do dominio, e
 * vale nos dois sentidos. Estes testes cobrem o lado do Zod; o lado do banco
 * esta coberto pelo CHECK constraint e pelo teste de integracao.
 */
describe('criarSessaoSchema — sessao do tipo Questoes', () => {
  test('aceita quando os tres contadores vem preenchidos', () => {
    const resultado = criarSessaoSchema.safeParse({
      ...base,
      tipoEstudo: 'Questoes',
      questoesAcertadas: 12,
      questoesErradas: 3,
      questoesBrancas: 0,
    });

    expect(resultado.success).toBe(true);
  });

  test('recusa quando falta um dos contadores', () => {
    const resultado = criarSessaoSchema.safeParse({
      ...base,
      tipoEstudo: 'Questoes',
      questoesAcertadas: 12,
      questoesErradas: 3,
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map((i) => i.path.join('.'))).toContain('questoesBrancas');
  });

  test('recusa contador negativo', () => {
    const resultado = criarSessaoSchema.safeParse({
      ...base,
      tipoEstudo: 'Questoes',
      questoesAcertadas: -1,
      questoesErradas: 3,
      questoesBrancas: 0,
    });

    expect(resultado.success).toBe(false);
  });
});

describe('criarSessaoSchema — demais tipos de estudo', () => {
  test.each(['Teoria', 'Revisao', 'Resumo'])('aceita %s sem contadores', (tipoEstudo) => {
    expect(criarSessaoSchema.safeParse({ ...base, tipoEstudo }).success).toBe(true);
  });

  test('recusa Teoria com contadores preenchidos', () => {
    const resultado = criarSessaoSchema.safeParse({
      ...base,
      tipoEstudo: 'Teoria',
      questoesAcertadas: 10,
      questoesErradas: 2,
      questoesBrancas: 1,
    });

    expect(resultado.success).toBe(false);
  });

  test('recusa tipo de estudo fora do enum', () => {
    expect(criarSessaoSchema.safeParse({ ...base, tipoEstudo: 'Simulado' }).success).toBe(false);
  });
});

describe('criarSessaoSchema — tempo de estudo', () => {
  test.each([0, -30, 45.5, 1441])('recusa tempoMinutos = %s', (tempoMinutos) => {
    const resultado = criarSessaoSchema.safeParse({
      topicoId: 1,
      tempoMinutos,
      tipoEstudo: 'Teoria',
    });

    expect(resultado.success).toBe(false);
  });
});
