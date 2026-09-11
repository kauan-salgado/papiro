import { z } from 'zod';
import { idNumerico } from '../../http/params.js';

export const criarTopicoSchema = z.object({
  disciplinaId: idNumerico,
  /** Numeracao literal do edital. VARCHAR(20) no banco. */
  codigoEdital: z.string().trim().max(20).nullish(),
  descricao: z.string().trim().min(3, 'Informe o texto do item do edital.'),
  ordem: z.number().int().min(0).optional(),
});

export const atualizarTopicoSchema = criarTopicoSchema.omit({ disciplinaId: true }).partial();
