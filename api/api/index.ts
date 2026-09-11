/**
 * Entrypoint serverless da Vercel.
 *
 * Por que este arquivo mora em `api/api/` e nao na raiz do repositorio: a
 * Vercel trata tudo que estiver em `<raiz-do-projeto>/api` como funcao. Com o
 * Root Directory do projeto apontando para `api/`, apenas esta pasta vira
 * funcao — `api/src/**` fica de fora, como deve ser. Na raiz do repositorio,
 * o backend inteiro viraria endpoint, e `api/src/lib/prisma.ts` seria
 * publicado como rota.
 *
 * O app do Express e um handler (req, res): a Vercel o invoca diretamente.
 */
import { createApp } from '../src/app.js';

export default createApp();
