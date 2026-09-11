import { z } from 'zod';

const MINUTOS_EM_UM_DIA = 1440;

/** Input numerico vazio chega como NaN via valueAsNumber; NaN vira "ausente". */
const semValor = (valor: unknown) =>
  typeof valor === 'number' && Number.isNaN(valor) ? undefined : valor;

const contadorObrigatorio = z.preprocess(
  semValor,
  z
    .number({ error: 'Obrigatório em sessão de questões.' })
    .int('Use números inteiros.')
    .min(0, 'Não pode ser negativo.'),
);

const contadorAusente = z.preprocess(
  semValor,
  z.undefined({ error: 'Só vale em sessão de questões.' }),
);

const camposComuns = {
  data: z.string().min(1, 'Informe a data da sessão.'),
  tempoMinutos: z.preprocess(
    semValor,
    z
      .number({ error: 'Informe o tempo de estudo.' })
      .int('Informe o tempo em minutos inteiros.')
      .positive('O tempo precisa ser maior que zero.')
      .max(MINUTOS_EM_UM_DIA, 'Uma sessão não passa de 24 horas.'),
  ),
  simuladoId: z.string().optional(),
  observacoes: z.string().max(2000, 'Observação muito longa.').optional(),
};

const semContadores = {
  questoesAcertadas: contadorAusente,
  questoesErradas: contadorAusente,
  questoesBrancas: contadorAusente,
};

/**
 * Uniao discriminada por tipoEstudo — o mesmo formato do schema do backend e da
 * regra que o CHECK constraint impoe no Postgres.
 *
 * Por que uniao e nao superRefine: refinamento so roda depois que o objeto
 * inteiro passa. Com o formulario vazio, o erro de "tempo obrigatorio" abortaria
 * a checagem e os tres contadores ficariam sem mensagem — o usuario corrigiria
 * o tempo, enviaria de novo e so entao descobriria que faltavam os contadores.
 * Na uniao, todos os campos do ramo escolhido sao validados na mesma passada.
 */
export const sessaoFormSchema = z.discriminatedUnion('tipoEstudo', [
  z.object({
    ...camposComuns,
    tipoEstudo: z.literal('Questoes'),
    questoesAcertadas: contadorObrigatorio,
    questoesErradas: contadorObrigatorio,
    questoesBrancas: contadorObrigatorio,
  }),
  z.object({ ...camposComuns, tipoEstudo: z.literal('Teoria'), ...semContadores }),
  z.object({ ...camposComuns, tipoEstudo: z.literal('Revisao'), ...semContadores }),
  z.object({ ...camposComuns, tipoEstudo: z.literal('Resumo'), ...semContadores }),
]);

export const CAMPOS_DE_QUESTOES = [
  'questoesAcertadas',
  'questoesErradas',
  'questoesBrancas',
] as const;

export type SessaoFormEntrada = z.input<typeof sessaoFormSchema>;
export type SessaoFormSaida = z.output<typeof sessaoFormSchema>;

export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');

  return `${agora.getFullYear()}-${mes}-${dia}`;
}
