import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Os testes de integracao falam com o Postgres do compose; rodar arquivos
    // em paralelo criaria disputa pelos mesmos registros.
    fileParallelism: false,
    setupFiles: ['dotenv/config'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.test.ts', 'src/server.ts'],
      // Limites que a suite ja cumpre: baixar daqui e regressao, nao "ajuste".
      thresholds: { statements: 85, lines: 85, functions: 85, branches: 70 },
    },
  },
});
