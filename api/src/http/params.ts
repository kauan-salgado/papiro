import { z } from 'zod';

/** Ids chegam como string na URL; aqui viram inteiro positivo ou 400. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const idNumerico = z.coerce.number().int().positive();

/** Filtro opcional por chave estrangeira em query string. */
export function filtroOpcional(chave: string) {
  return z.object({ [chave]: idNumerico.optional() });
}
