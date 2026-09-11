import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { filtroDisciplina, filtroTopico } from '../../http/posse.js';
import { prisma } from '../../lib/prisma.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { listarSessoesDoTopico } from '../sessoes/sessoes.service.js';
import { atualizarTopicoSchema, criarTopicoSchema } from './topicos.schema.js';

export const topicosRoutes = Router();

topicosRoutes.get('/', async (req, res) => {
  const { disciplinaId } = filtroOpcional('disciplinaId').parse(req.query);

  const topicos = await prisma.topico.findMany({
    where: { ...filtroTopico(idDoUsuario(req)), ...(disciplinaId && { disciplinaId }) },
    orderBy: [{ disciplinaId: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
  });

  res.json(sucesso(topicos));
});

topicosRoutes.post('/', async (req, res) => {
  const dados = criarTopicoSchema.parse(req.body);

  const disciplina = await prisma.disciplina.findFirst({
    where: { id: dados.disciplinaId, ...filtroDisciplina(idDoUsuario(req)) },
    select: { id: true },
  });

  if (!disciplina) {
    throw new NaoEncontradoError('Disciplina', dados.disciplinaId);
  }

  const topico = await prisma.topico.create({
    data: {
      disciplinaId: dados.disciplinaId,
      codigoEdital: dados.codigoEdital ?? null,
      descricao: dados.descricao,
      ordem: dados.ordem ?? null,
    },
  });

  res.status(201).json(sucesso(topico));
});

topicosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const topico = await prisma.topico.findFirst({
    where: { id, ...filtroTopico(idDoUsuario(req)) },
    include: { disciplina: { select: { id: true, nome: true, cargoId: true } } },
  });

  if (!topico) {
    throw new NaoEncontradoError('Topico', id);
  }

  res.json(sucesso(topico));
});

/** Historico de sessoes do topico — alimenta a lista sob o formulario inline. */
topicosRoutes.get('/:id/sessoes', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  res.json(sucesso(await listarSessoesDoTopico(id, idDoUsuario(req))));
});

topicosRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarTopicoSchema.parse(req.body);

  const { count } = await prisma.topico.updateMany({
    where: { id, ...filtroTopico(idDoUsuario(req)) },
    data: {
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.codigoEdital !== undefined && { codigoEdital: dados.codigoEdital ?? null }),
      ...(dados.ordem !== undefined && { ordem: dados.ordem }),
    },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Topico', id);
  }

  res.json(sucesso(await prisma.topico.findUnique({ where: { id } })));
});

topicosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const { count } = await prisma.topico.deleteMany({
    where: { id, ...filtroTopico(idDoUsuario(req)) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Topico', id);
  }

  res.status(204).send();
});
