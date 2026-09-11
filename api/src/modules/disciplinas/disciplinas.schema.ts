import { z } from 'zod';
import { idNumerico } from '../../http/params.js';

export const criarDisciplinaSchema = z.object({
  cargoId: idNumerico,
  nome: z.string().trim().min(2, 'Informe o nome da disciplina.').max(120),
  /** NUMERIC(4,2) no banco: ate 99.99. */
  peso: z.number().min(0).max(99.99).optional(),
});

export const atualizarDisciplinaSchema = criarDisciplinaSchema.omit({ cargoId: true }).partial();
