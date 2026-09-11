import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { prisma } from '../../lib/prisma.js';
import { atualizarDisciplinaSchema, criarDisciplinaSchema } from './disciplinas.schema.js';

export const disciplinasRoutes = Router();

disciplinasRoutes.get('/', async (req, res) => {
  const { cargoId } = filtroOpcional('cargoId').parse(req.query);

  const disciplinas = await prisma.disciplina.findMany({
    where: cargoId ? { cargoId } : undefined,
    orderBy: [{ cargoId: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { topicos: true } } },
  });

  res.json(sucesso(disciplinas));
});

disciplinasRoutes.post('/', async (req, res) => {
  const dados = criarDisciplinaSchema.parse(req.body);

  const disciplina = await prisma.disciplina.create({
    data: { cargoId: dados.cargoId, nome: dados.nome, peso: dados.peso ?? 1 },
  });

  res.status(201).json(sucesso(disciplina));
});

disciplinasRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const disciplina = await prisma.disciplina.findUnique({
    where: { id },
    include: { topicos: { orderBy: [{ ordem: 'asc' }, { id: 'asc' }] } },
  });

  if (!disciplina) {
    throw new NaoEncontradoError('Disciplina', id);
  }

  res.json(sucesso(disciplina));
});

disciplinasRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarDisciplinaSchema.parse(req.body);

  const disciplina = await prisma.disciplina.update({ where: { id }, data: dados });

  res.json(sucesso(disciplina));
});

disciplinasRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  await prisma.disciplina.delete({ where: { id } });

  res.status(204).send();
});
