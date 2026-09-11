import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../env.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Prisma 7 nao usa mais engine binaria: a conexao passa por um driver adapter
 * (node-postgres). Instancia unica por processo — criar um client por request
 * esgota o pool do Postgres.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
