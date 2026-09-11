import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { idParamSchema } from '../../http/params.js';
import { filtroConcurso } from '../../http/posse.js';
import { paraDataDoBanco } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { atualizarConcursoSchema, criarConcursoSchema } from './concursos.schema.js';

export const concursosRoutes = Router();

/**
 * Nivel raiz do modelo e ancora da autorizacao: e aqui que mora o dono, e por
 * isso todas as consultas abaixo na hierarquia acabam passando por este campo.
 */
concursosRoutes.get('/', async (req, res) => {
  const concursos = await prisma.concurso.findMany({
    where: filtroConcurso(idDoUsuario(req)),
    orderBy: [{ dataProva: 'asc' }, { nome: 'asc' }],
    include: {
      cargos: {
        orderBy: { nome: 'asc' },
        include: { _count: { select: { disciplinas: true, simulados: true } } },
      },
    },
  });

  res.json(sucesso(concursos));
});

concursosRoutes.post('/', async (req, res) => {
  const dados = criarConcursoSchema.parse(req.body);

  const concurso = await prisma.concurso.create({
    data: {
      usuarioId: idDoUsuario(req),
      nome: dados.nome,
      banca: dados.banca ?? null,
      dataProva: dados.dataProva ? paraDataDoBanco(dados.dataProva) : null,
    },
  });

  res.status(201).json(sucesso(concurso));
});

concursosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  // findFirst, e nao findUnique: o filtro precisa combinar id E dono, e o
  // registro de outra pessoa tem de responder 404 — nao 403. Dizer "existe,
  // mas nao e seu" ja entrega informacao que nao e de quem perguntou.
  const concurso = await prisma.concurso.findFirst({
    where: { id, ...filtroConcurso(idDoUsuario(req)) },
    include: { cargos: { orderBy: { nome: 'asc' } } },
  });

  if (!concurso) {
    throw new NaoEncontradoError('Concurso', id);
  }

  res.json(sucesso(concurso));
});

concursosRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarConcursoSchema.parse(req.body);

  // updateMany aceita filtro composto; o count revela se alcancou algo.
  const { count } = await prisma.concurso.updateMany({
    where: { id, ...filtroConcurso(idDoUsuario(req)) },
    data: {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.banca !== undefined && { banca: dados.banca ?? null }),
      ...(dados.dataProva !== undefined && {
        dataProva: dados.dataProva ? paraDataDoBanco(dados.dataProva) : null,
      }),
    },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Concurso', id);
  }

  res.json(sucesso(await prisma.concurso.findUnique({ where: { id } })));
});

/** ON DELETE CASCADE leva junto cargos, disciplinas, topicos e sessoes. */
concursosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const { count } = await prisma.concurso.deleteMany({
    where: { id, ...filtroConcurso(idDoUsuario(req)) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Concurso', id);
  }

  res.status(204).send();
});
