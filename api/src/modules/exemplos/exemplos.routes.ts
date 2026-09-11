import { Router } from 'express';
import { sucesso } from '../../http/envelope.js';
import { idDoUsuario } from '../../middlewares/autenticacao.js';
import { carregarExemplos } from './exemplos.service.js';

export const exemplosRoutes = Router();

/**
 * Enche a conta de quem pediu com os dois editais de exemplo e um historico
 * ficticio. Sempre na propria conta — o usuario vem da sessao, nunca do corpo
 * da requisicao.
 */
exemplosRoutes.post('/', async (req, res) => {
  res.status(201).json(sucesso(await carregarExemplos(idDoUsuario(req))));
});
