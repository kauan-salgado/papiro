import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { prisma } from '../../lib/prisma.js';
import { atualizarCargoSchema, criarCargoSchema, importarEditalSchema } from './cargos.schema.js';
import { importarEdital, montarEditalVerticalizado } from './cargos.service.js';

export const cargosRoutes = Router();

cargosRoutes.get('/', async (req, res) => {
  const { concursoId } = filtroOpcional('concursoId').parse(req.query);

  const cargos = await prisma.cargo.findMany({
    where: concursoId ? { concursoId } : undefined,
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

  const cargo = await prisma.cargo.create({ data: dados });

  res.status(201).json(sucesso(cargo));
});

cargosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const cargo = await prisma.cargo.findUnique({
    where: { id },
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

  res.json(sucesso(await montarEditalVerticalizado(id)));
});

/** Importacao em lote: [{ disciplina, codigoEdital, descricao }, ...]. */
cargosRoutes.post('/:id/edital/importar', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const entrada = importarEditalSchema.parse(req.body);

  res.status(201).json(sucesso(await importarEdital(id, entrada)));
});

cargosRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCargoSchema.parse(req.body);

  res.json(sucesso(await prisma.cargo.update({ where: { id }, data: dados })));
});

cargosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  await prisma.cargo.delete({ where: { id } });

  res.status(204).send();
});
