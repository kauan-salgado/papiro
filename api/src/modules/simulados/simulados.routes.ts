import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { NaoEncontradoError } from '../../http/erros.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { filtroCargo, filtroSimulado } from '../../http/posse.js';
import { formatarDataISO, paraDataDoBanco } from '../../lib/datas.js';
import { prisma } from '../../lib/prisma.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { atualizarSimuladoSchema, criarSimuladoSchema } from './simulados.schema.js';
import { consolidarSimulado } from './simulados.service.js';

export const simuladosRoutes = Router();

simuladosRoutes.get('/', async (req, res) => {
  const { cargoId } = filtroOpcional('cargoId').parse(req.query);

  const simulados = await prisma.simulado.findMany({
    where: { ...filtroSimulado(idDoUsuario(req)), ...(cargoId && { cargoId }) },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    include: { _count: { select: { sessoes: true } } },
  });

  res.json(
    sucesso(simulados.map((simulado) => ({ ...simulado, data: formatarDataISO(simulado.data) }))),
  );
});

simuladosRoutes.post('/', async (req, res) => {
  const dados = criarSimuladoSchema.parse(req.body);

  const cargo = await prisma.cargo.findFirst({
    where: { id: dados.cargoId, ...filtroCargo(idDoUsuario(req)) },
    select: { id: true },
  });

  if (!cargo) {
    throw new NaoEncontradoError('Cargo', dados.cargoId);
  }

  const simulado = await prisma.simulado.create({
    data: {
      cargoId: dados.cargoId,
      nome: dados.nome,
      ...(dados.data && { data: paraDataDoBanco(dados.data) }),
    },
  });

  res.status(201).json(sucesso({ ...simulado, data: formatarDataISO(simulado.data) }));
});

/** Visao consolidada da prova inteira, reagrupando as sessoes por disciplina. */
simuladosRoutes.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  res.json(sucesso(await consolidarSimulado(id, idDoUsuario(req))));
});

simuladosRoutes.patch('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarSimuladoSchema.parse(req.body);

  const { count } = await prisma.simulado.updateMany({
    where: { id, ...filtroSimulado(idDoUsuario(req)) },
    data: {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.data !== undefined && { data: paraDataDoBanco(dados.data) }),
    },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Simulado', id);
  }

  const simulado = await prisma.simulado.findUniqueOrThrow({ where: { id } });

  res.json(sucesso({ ...simulado, data: formatarDataISO(simulado.data) }));
});

/**
 * ON DELETE SET NULL: apagar o simulado nao apaga as sessoes que ele agrupava.
 * O estudo aconteceu — o que se perde e apenas o agrupamento.
 */
simuladosRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  const { count } = await prisma.simulado.deleteMany({
    where: { id, ...filtroSimulado(idDoUsuario(req)) },
  });

  if (count === 0) {
    throw new NaoEncontradoError('Simulado', id);
  }

  res.status(204).send();
});
