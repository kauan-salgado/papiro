import { z } from 'zod';
import { idNumerico } from '../../http/params.js';

export const criarCargoSchema = z.object({
  concursoId: idNumerico,
  nome: z.string().trim().min(2, 'Informe o nome do cargo.').max(150),
});

export const atualizarCargoSchema = criarCargoSchema.omit({ concursoId: true }).partial();

/** Formato da importacao em lote: a mesma tripla usada pelo seed. */
export const itemEditalSchema = z.object({
  disciplina: z.string().trim().min(2).max(120),
  codigoEdital: z.string().trim().max(20).nullish(),
  descricao: z.string().trim().min(3),
});

export const importarEditalSchema = z.object({
  itens: z.array(itemEditalSchema).min(1, 'Envie ao menos um item de edital.'),
  /** Apaga as disciplinas atuais do cargo antes de importar. Destrutivo. */
  substituir: z.boolean().default(false),
  pesos: z.record(z.string(), z.number().min(0).max(99.99)).optional(),
});

export type ItemEdital = z.infer<typeof itemEditalSchema>;
export type ImportarEdital = z.infer<typeof importarEditalSchema>;
