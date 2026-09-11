import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { filtroCargo, filtroDisciplina } from '../../http/posse.js';
import { prisma } from '../../lib/prisma.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { listarSessoesDaDisciplina } from '../sessoes/sessoes.service.js';
import { atualizarDisciplinaSchema, criarDisciplinaSchema } from './disciplinas.schema.js';

export const disciplinasRoutes = Router();

disciplinasRoutes.get('/', async (req, res) => {
  const { cargoId } = filtroOpcional('cargoId').parse(req.query);

  const disciplinas = await prisma.disciplina.findMany({
    where: { ...filtroDisciplina(idDoUsuario(req)), ...(cargoId && { cargoId }) },
    orderBy: [{ cargoId: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { topicos: true } } },
  });

  res.json(sucesso(disciplinas));
});

disciplinasRoutes.post('/', async (req, res) => {
  const dados = criarDisciplinaSchema.parse(req.body);

  const cargo = await prisma.cargo.findFirst({
    where: { id: dados.cargoId, ...filtroCargo(idDoUsuario(req)) },
    select: { id: true },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', dados.cargoId);
  }

  const disciplina = await prisma.disciplina.create({
    data: { cargoId: dados.cargoId, nome: dados.nome, peso: dados.peso ?? 1 },
  });

  res.status(201).json(sucesso(disciplina));
});

disciplinasRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const disciplina = await prisma.disciplina.findFirst({
    where: { id, ...filtroDisciplina(idDoUsuario(req)) },
    include: { topicos: { orderBy: [{ ordem: 'asc' }, { id: 'asc' }] } },
  });

  if (!disciplina) {
    throw new NaoEncontradoError('Disciplina', id);
  }

  res.json(sucesso(disciplina));
});

/** Baterias avulsas da materia — o que nao cabe em um item do edital. */
disciplinasRoutes.get('/:id/sessoes', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  res.json(sucesso(await listarSessoesDaDisciplina(id, idDoUsuario(req))));
});

disciplinasRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarDisciplinaSchema.parse(req.body);

  const { count } = await prisma.disciplina.updateMany({
    where: { id, ...filtroDisciplina(idDoUsuario(req)) },
    data: dados,
  });

  if (count === 0) {
    throw new NaoEncontradoError('Disciplina', id);
  }

  res.json(sucesso(await prisma.disciplina.findUnique({ where: { id } })));
});

disciplinasRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const { count } = await prisma.disciplina.deleteMany({
    where: { id, ...filtroDisciplina(idDoUsuario(req)) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Disciplina', id);
  }

  res.status(204).send();
});
