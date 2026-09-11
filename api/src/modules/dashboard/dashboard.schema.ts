import { z } from 'zod';

/**
 * As views sao um contrato: se alguem alterar uma coluna e esquecer da API, o
 * parse falha aqui com mensagem clara em vez de propagar undefined ate o
 * grafico. Validar a saida do banco e validacao de borda como qualquer outra.
 */
export const linhaDesempenhoDisciplinaSchema = z.object({
  disciplinaId: z.number().int(),
  disciplina: z.string(),
  peso: z.number().nullable(),
  cargoId: z.number().int(),
  cargo: z.string(),
  concursoId: z.number().int(),
  concurso: z.string(),
  totalSessoes: z.number().int(),
  totalMinutos: z.number().int(),
  acertos: z.number().int(),
  erros: z.number().int(),
  brancos: z.number().int(),
  percentualAcerto: z.number().nullable(),
});

export const linhaDesempenhoTopicoSchema = z.object({
  topicoId: z.number().int(),
  codigoEdital: z.string().nullable(),
  topico: z.string(),
  ordem: z.number().int().nullable(),
  disciplinaId: z.number().int(),
  disciplina: z.string(),
  totalSessoes: z.number().int(),
  totalMinutos: z.number().int(),
  acertos: z.number().int(),
  erros: z.number().int(),
  brancos: z.number().int(),
  ultimoEstudo: z.string().nullable(),
  percentualAcerto: z.number().nullable(),
});

export type DesempenhoDisciplina = z.infer<typeof linhaDesempenhoDisciplinaSchema>;
export type DesempenhoTopico = z.infer<typeof linhaDesempenhoTopicoSchema>;
