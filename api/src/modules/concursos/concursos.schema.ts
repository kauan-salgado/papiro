import { z } from 'zod';
import { dataISOSchema } from '../../lib/datas.js';

export const criarConcursoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome do concurso.').max(150),
  banca: z.string().trim().max(80).nullish(),
  dataProva: dataISOSchema.nullish(),
});

export const atualizarConcursoSchema = criarConcursoSchema.partial();

export type CriarConcurso = z.infer<typeof criarConcursoSchema>;
