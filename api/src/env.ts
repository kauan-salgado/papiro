import { z } from 'zod';

/**
 * Validacao das variaveis de ambiente no boot (fail fast).
 * Se faltar algo essencial, o processo morre aqui com mensagem clara -
 * nunca no meio de uma request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Variaveis de ambiente invalidas:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
