import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { idParamSchema } from '../../http/params.js';
import { paraDataDoBanco } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import { atualizarConcursoSchema, criarConcursoSchema } from './concursos.schema.js';

export const concursosRoutes = Router();

/** Nivel raiz do modelo: cada concurso carrega seus proprios cargos e editais. */
concursosRoutes.get('/', async (_req, res) => {
  const concursos = await prisma.concurso.findMany({
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
      nome: dados.nome,
      banca: dados.banca ?? null,
      dataProva: dados.dataProva ? paraDataDoBanco(dados.dataProva) : null,
    },
  });

  res.status(201).json(sucesso(concurso));
});

concursosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const concurso = await prisma.concurso.findUnique({
    where: { id },
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

  const concurso = await prisma.concurso.update({
    where: { id },
    data: {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.banca !== undefined && { banca: dados.banca ?? null }),
      ...(dados.dataProva !== undefined && {
        dataProva: dados.dataProva ? paraDataDoBanco(dados.dataProva) : null,
      }),
    },
  });

  res.json(sucesso(concurso));
});

/** ON DELETE CASCADE leva junto cargos, disciplinas, topicos e sessoes. */
concursosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  await prisma.concurso.delete({ where: { id } });

  res.status(204).send();
});
