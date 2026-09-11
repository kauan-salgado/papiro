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
  /**
   * Liga a protecao da vitrine publica. Fica desligado por padrao: quem roda o
   * projeto na propria maquina e dono dos proprios dados.
   */
  /**
   * Credenciais do OAuth App do GitHub. Ausentes, o login fica indisponivel e
   * a API diz isso claramente, em vez de quebrar no meio do fluxo.
   */
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  /**
   * Abre uma vitrine somente leitura para quem nao entrou: o visitante enxerga
   * a conta de demonstracao, sem poder escrever nada.
   */
  VITRINE_PUBLICA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),
  MODO_DEMO: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Variaveis de ambiente invalidas:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
