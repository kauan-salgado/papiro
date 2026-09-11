import { z } from 'zod';
import { idNumerico } from '../../http/params.js';
import { dataISOSchema } from '../../lib/datas.js';

export const criarSimuladoSchema = z.object({
  cargoId: idNumerico,
  nome: z.string().trim().min(2, 'Informe o nome do simulado.').max(150),
  data: dataISOSchema.optional(),
});

export const atualizarSimuladoSchema = criarSimuladoSchema.omit({ cargoId: true }).partial();

export const linhaConsolidadoSchema = z.object({
  disciplinaId: z.number().int(),
  disciplina: z.string(),
  totalSessoes: z.number().int(),
  totalMinutos: z.number().int(),
  acertos: z.number().int(),
  erros: z.number().int(),
  brancos: z.number().int(),
  percentualAcerto: z.number().nullable(),
});
