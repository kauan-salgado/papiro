import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    /**
     * Este arquivo configura apenas a CLI (migrate, seed, studio) — o runtime
     * da aplicacao monta o proprio client em src/lib/prisma.ts.
     *
     * Por isso a CLI prefere DIRECT_DATABASE_URL quando ela existe: no Neon, a
     * DATABASE_URL do runtime aponta para o pooler (certo para as conexoes
     * efemeras do serverless) e as migrations querem conexao direta. Em
     * desenvolvimento a variavel nao existe e as duas sao a mesma coisa.
     */
    url: process.env['DIRECT_DATABASE_URL']
      ? env('DIRECT_DATABASE_URL')
      : env('DATABASE_URL'),
  },
});
