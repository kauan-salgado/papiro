import { z } from 'zod';
import { idNumerico } from '../../http/params.js';
import { dataISOSchema } from '../../lib/datas.js';

const MINUTOS_EM_UM_DIA = 1440;

const baseSessao = z.object({
  topicoId: idNumerico,
  /** Opcional: nem toda sessao pertence a um simulado. */
  simuladoId: idNumerico.nullish(),
  data: dataISOSchema.optional(),
  tempoMinutos: z
    .number()
    .int('Informe o tempo em minutos inteiros.')
    .positive('O tempo de estudo precisa ser maior que zero.')
    .max(MINUTOS_EM_UM_DIA, 'Uma sessao nao pode passar de 24 horas.'),
  observacoes: z.string().trim().max(2000).nullish(),
});

/** Mensagem propria para o campo ausente: o default do Zod sairia em ingles. */
const contadorQuestoes = z
  .number({ error: 'Sessao de "Questoes" exige acertadas, erradas e brancas.' })
  .int('Os contadores de questoes sao numeros inteiros.')
  .min(0, 'Os contadores de questoes nao podem ser negativos.');

/** A outra metade da regra: os demais tipos recusam contadores. */
const semContadores = z
  .null({ error: 'Contadores de questoes so valem para sessoes do tipo "Questoes".' })
  .optional();

/**
 * Uniao discriminada por tipoEstudo — o mesmo formato da regra condicional que
 * o CHECK chk_questoes_obrigatorias impoe no banco, nos dois sentidos:
 *   - Questoes exige os tres contadores;
 *   - qualquer outro tipo recusa os tres.
 *
 * Os nomes do enum vem sem acento porque e assim que o Prisma Client os expoe
 * (no banco eles sao 'Revisão' e 'Questões', via @map).
 */
export const criarSessaoSchema = z.discriminatedUnion('tipoEstudo', [
  baseSessao.extend({
    tipoEstudo: z.literal('Questoes'),
    questoesAcertadas: contadorQuestoes,
    questoesErradas: contadorQuestoes,
    questoesBrancas: contadorQuestoes,
  }),
  baseSessao.extend({
    tipoEstudo: z.literal('Teoria'),
    questoesAcertadas: semContadores,
    questoesErradas: semContadores,
    questoesBrancas: semContadores,
  }),
  baseSessao.extend({
    tipoEstudo: z.literal('Revisao'),
    questoesAcertadas: semContadores,
    questoesErradas: semContadores,
    questoesBrancas: semContadores,
  }),
  baseSessao.extend({
    tipoEstudo: z.literal('Resumo'),
    questoesAcertadas: semContadores,
    questoesErradas: semContadores,
    questoesBrancas: semContadores,
  }),
]);

export type CriarSessao = z.infer<typeof criarSessaoSchema>;
