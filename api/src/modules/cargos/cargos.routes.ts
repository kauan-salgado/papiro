import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { filtroCargo, filtroConcurso } from '../../http/posse.js';
import { prisma } from '../../lib/prisma.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { atualizarCargoSchema, criarCargoSchema, importarEditalSchema } from './cargos.schema.js';
import { importarEdital, montarEditalVerticalizado } from './cargos.service.js';

export const cargosRoutes = Router();

cargosRoutes.get('/', async (req, res) => {
  const { concursoId } = filtroOpcional('concursoId').parse(req.query);
  const usuarioId = idDoUsuario(req);

  const cargos = await prisma.cargo.findMany({
    where: { ...filtroCargo(usuarioId), ...(concursoId && { concursoId }) },
    orderBy: [{ concursoId: 'asc' }, { nome: 'asc' }],
    include: {
      concurso: { select: { id: true, nome: true, banca: true } },
      _count: { select: { disciplinas: true, simulados: true } },
    },
  });

  res.json(sucesso(cargos));
});

cargosRoutes.post('/', async (req, res) => {
  const dados = criarCargoSchema.parse(req.body);
  const usuarioId = idDoUsuario(req);

  // Sem esta checagem, bastaria mandar o concursoId de outra pessoa para
  // pendurar um cargo no edital dela.
  const concurso = await prisma.concurso.findFirst({
    where: { id: dados.concursoId, ...filtroConcurso(usuarioId) },
    select: { id: true },
  });

  if (!concurso) {
    throw new NaoEncontradoError('Concurso', dados.concursoId);
  }

  res.status(201).json(sucesso(await prisma.cargo.create({ data: dados })));
});

cargosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const cargo = await prisma.cargo.findFirst({
    where: { id, ...filtroCargo(idDoUsuario(req)) },
    include: { concurso: true, disciplinas: { orderBy: { nome: 'asc' } } },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', id);
  }

  res.json(sucesso(cargo));
});

/** Tela principal: o edital inteiro com metricas, em uma requisicao so. */
cargosRoutes.get('/:id/edital', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  res.json(sucesso(await montarEditalVerticalizado(id, idDoUsuario(req))));
});

/** Importacao em lote: [{ disciplina, codigoEdital, descricao }, ...]. */
cargosRoutes.post('/:id/edital/importar', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const entrada = importarEditalSchema.parse(req.body);

  res.status(201).json(sucesso(await importarEdital(id, idDoUsuario(req), entrada)));
});

cargosRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCargoSchema.parse(req.body);

  const { count } = await prisma.cargo.updateMany({
    where: { id, ...filtroCargo(idDoUsuario(req)) },
    data: dados,
  });

  if (count === 0) {
    throw new NaoEncontradoError('Cargo', id);
  }

  res.json(sucesso(await prisma.cargo.findUnique({ where: { id } })));
});

cargosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const { count } = await prisma.cargo.deleteMany({
    where: { id, ...filtroCargo(idDoUsuario(req)) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Cargo', id);
  }

  res.status(204).send();
});
