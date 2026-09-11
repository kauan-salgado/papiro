import { describe, expect, test } from 'vitest';
import { traduzirErroDePersistencia } from './prisma-erros.js';

/**
 * Estes objetos reproduzem a forma real do erro do Prisma 7 com driver adapter
 * (capturada rodando contra o Postgres): PrismaClientKnownRequestError com code
 * P2039 e o erro do Postgres embrulhado em meta.driverAdapterError.cause.
 */
function erroDeCheck(constraint: string) {
  return {
    code: 'P2039',
    meta: {
      modelName: 'SessaoEstudo',
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: {
          code: '23514',
          kind: 'postgres',
          message: `new row for relation "sessoes_estudo" violates check constraint "${constraint}"`,
        },
      },
    },
  };
}

describe('traduzirErroDePersistencia — CHECK constraint (23514)', () => {
  test('vira 400, e nao 500: o CHECK e validacao, nao defeito', () => {
    const traduzido = traduzirErroDePersistencia(erroDeCheck('chk_questoes_obrigatorias'));

    expect(traduzido?.status).toBe(400);
  });

  test('explica a regra das questoes em vez de vazar SQL', () => {
    const traduzido = traduzirErroDePersistencia(erroDeCheck('chk_questoes_obrigatorias'));

    expect(traduzido?.message).toContain('Questoes');
    expect(traduzido?.message).not.toContain('violates');
  });

  test('reconhece a constraint de tempo positivo', () => {
    const traduzido = traduzirErroDePersistencia(erroDeCheck('chk_tempo_minutos_positivo'));

    expect(traduzido?.message).toContain('maior que zero');
  });

  test('mantem mensagem generica para uma constraint desconhecida', () => {
    const traduzido = traduzirErroDePersistencia(erroDeCheck('chk_regra_futura'));

    expect(traduzido?.status).toBe(400);
    expect(traduzido?.message).toContain('regra de integridade');
  });

  test('devolve o nome da constraint nos detalhes, para depuracao', () => {
    const traduzido = traduzirErroDePersistencia(erroDeCheck('chk_questoes_nao_negativas'));

    expect(traduzido?.detalhes).toMatchObject({
      constraint: 'chk_questoes_nao_negativas',
      codigoPostgres: '23514',
    });
  });
});

describe('traduzirErroDePersistencia — demais codigos', () => {
  test('P2003 (chave estrangeira) vira 400', () => {
    const traduzido = traduzirErroDePersistencia({
      code: 'P2003',
      meta: {
        driverAdapterError: {
          cause: {
            kind: 'ForeignKeyConstraintViolation',
            constraint: { index: 'sessoes_estudo_topico_id_fkey' },
          },
        },
      },
    });

    expect(traduzido?.status).toBe(400);
  });

  test('P2025 (registro ausente) vira 404', () => {
    expect(traduzirErroDePersistencia({ code: 'P2025' })?.status).toBe(404);
  });

  test('P2002 em codigo_edital explica a unicidade do item', () => {
    const traduzido = traduzirErroDePersistencia({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'topicos_disciplina_id_codigo_edital_key' } },
        },
      },
    });

    expect(traduzido?.status).toBe(409);
    expect(traduzido?.message).toContain('codigo de edital');
  });

  test('erro desconhecido devolve null para virar 500', () => {
    expect(traduzirErroDePersistencia(new Error('cabo de rede arrancado'))).toBeNull();
  });
});
