import { describe, expect, test } from 'vitest';
import { sessaoFormSchema } from './sessao.schema.js';

const base = { data: '2026-09-10', tempoMinutos: 45 };

function erros(valores: unknown): Record<string, string> {
  const resultado = sessaoFormSchema.safeParse(valores);

  if (resultado.success) {
    return {};
  }

  return Object.fromEntries(
    resultado.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
}

/**
 * Mesma regra que o Zod do backend valida e que o CHECK constraint do Postgres
 * impoe. Tres copias da regra parecem repeticao, mas cada uma protege uma
 * fronteira diferente — e sao estes testes que garantem que elas nao divergem.
 */
describe('regra condicional das questoes', () => {
  test('aceita Questoes com os tres contadores', () => {
    expect(erros({ ...base, tipoEstudo: 'Questoes', questoesAcertadas: 12, questoesErradas: 3, questoesBrancas: 1 })).toEqual({});
  });

  test('exige os tres quando o tipo e Questoes', () => {
    const encontrados = erros({ ...base, tipoEstudo: 'Questoes' });

    expect(encontrados['questoesAcertadas']).toBe('Obrigatório em sessão de questões.');
    expect(encontrados['questoesErradas']).toBeDefined();
    expect(encontrados['questoesBrancas']).toBeDefined();
  });

  test('recusa contadores quando o tipo NAO e Questoes', () => {
    const encontrados = erros({ ...base, tipoEstudo: 'Teoria', questoesAcertadas: 10 });

    expect(encontrados['questoesAcertadas']).toBe('Só vale em sessão de questões.');
  });

  test.each(['Teoria', 'Revisao', 'Resumo'])('aceita %s sem contadores', (tipoEstudo) => {
    expect(erros({ ...base, tipoEstudo })).toEqual({});
  });

  test('reporta tempo E contadores na mesma passada', () => {
    // O motivo de o schema ser uniao e nao superRefine: refinamento so roda
    // depois que o objeto base passa, e o usuario descobriria os erros em duas
    // rodadas.
    const encontrados = erros({ data: '2026-09-10', tipoEstudo: 'Questoes' });

    expect(Object.keys(encontrados).sort()).toEqual([
      'questoesAcertadas',
      'questoesBrancas',
      'questoesErradas',
      'tempoMinutos',
    ]);
  });
});

describe('tempo de estudo', () => {
  test.each([0, -30, 45.5, 1441])('recusa %s', (tempoMinutos) => {
    expect(erros({ ...base, tempoMinutos, tipoEstudo: 'Teoria' })['tempoMinutos']).toBeDefined();
  });

  test('campo vazio (NaN vindo do input) vira "informe o tempo"', () => {
    expect(erros({ ...base, tempoMinutos: Number.NaN, tipoEstudo: 'Teoria' })['tempoMinutos']).toBe(
      'Informe o tempo de estudo.',
    );
  });
});

describe('contadores', () => {
  test('recusa negativo', () => {
    const encontrados = erros({ ...base, tipoEstudo: 'Questoes', questoesAcertadas: -1, questoesErradas: 0, questoesBrancas: 0 });

    expect(encontrados['questoesAcertadas']).toBe('Não pode ser negativo.');
  });

  test('aceita zero', () => {
    expect(erros({ ...base, tipoEstudo: 'Questoes', questoesAcertadas: 0, questoesErradas: 0, questoesBrancas: 0 })).toEqual({});
  });
});
