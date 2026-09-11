import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { filtroOpcional, idParamSchema } from '../../http/params.js';
import { criarSessaoSchema } from './sessoes.schema.js';
import { excluirSessao, listarSessoesDoTopico, registrarSessao } from './sessoes.service.js';

export const sessoesRoutes = Router();

sessoesRoutes.get('/', async (req, res) => {
  const { topicoId } = filtroOpcional('topicoId').parse(req.query);

  if (!topicoId) {
    res.json(sucesso([]));
    return;
  }

  res.json(sucesso(await listarSessoesDoTopico(topicoId)));
});

/**
 * Registro de uma sessao. Tres camadas de defesa, na ordem:
 *   1. Zod (aqui)                         -> 400 com os campos invalidos
 *   2. regra de dominio no service        -> 400 (simulado de outro cargo)
 *   3. CHECK constraint do Postgres       -> 400 traduzido do 23514
 * A terceira nunca deveria disparar pela API; ela existe para o dia em que a
 * primeira e a segunda ficarem dessincronizadas do banco.
 */
sessoesRoutes.post('/', async (req, res) => {
  const dados = criarSessaoSchema.parse(req.body);

  res.status(201).json(sucesso(await registrarSessao(dados)));
});

sessoesRoutes.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  await excluirSessao(id);

  res.status(204).send();
});
