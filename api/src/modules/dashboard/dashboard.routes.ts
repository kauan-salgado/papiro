import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { filtroOpcional, idNumerico } from '../../http/params.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { desempenhoPorDisciplina, desempenhoPorTopico } from './dashboard.service.js';
import { z } from 'zod';

export const dashboardRoutes = Router();

/** Visao macro. Sem cargoId, devolve todas as disciplinas de todos os editais. */
dashboardRoutes.get('/disciplinas', async (req, res) => {
  const { cargoId } = filtroOpcional('cargoId').parse(req.query);

  res.json(sucesso(await desempenhoPorDisciplina(idDoUsuario(req), cargoId)));
});

/** Visao micro: ranking de topicos de uma disciplina, do pior para o melhor. */
dashboardRoutes.get('/topicos/:disciplinaId', async (req, res) => {
  const { disciplinaId } = z.object({ disciplinaId: idNumerico }).parse(req.params);

  res.json(sucesso(await desempenhoPorTopico(idDoUsuario(req), disciplinaId)));
});
