import type { NextFunction, Request, Response } from 'express';
import { falha } from '../http/envelope.js';

/**
 * Protecao da demonstracao publica.
 *
 * O Papiro nao tem autenticacao — decisao consciente, documentada no README,
 * e inofensiva enquanto ele roda na maquina de quem estuda. Publicado, deixa
 * de ser: `DELETE /api/concursos/:id` apaga cargos, disciplinas, topicos e
 * sessoes em cascata, e qualquer visitante curioso zeraria a vitrine.
 *
 * Este middleware bloqueia so o que destroi trabalho alheio. Registrar e
 * excluir sessoes continua liberado: e justamente o fluxo que a demonstracao
 * precisa mostrar, e o estrago maximo e uma linha a mais na fact table.
 *
 * Nao e substituto de autenticacao — e um limitador de dano enquanto ela nao
 * existe.
 */

const EXCLUSOES_ESTRUTURAIS = /^\/(concursos|cargos|disciplinas|topicos)\/\d+$/;
const IMPORTACAO = /^\/cargos\/\d+\/edital\/importar$/;

const MENSAGEM =
  'Esta é uma demonstração pública: ações que apagam o edital estão desativadas. ' +
  'Registrar e excluir sessões de estudo continua liberado. ' +
  'Para usar sem limites, rode o projeto localmente (veja o README).';

/**
 * Recebe a flag em vez de ler o ambiente por dentro: assim o teste liga e
 * desliga o modo sem mexer em variavel global de processo.
 */
export function modoDemonstracao(ativo: boolean) {
  return function bloquearAcoesDestrutivas(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!ativo) {
      next();
      return;
    }

    const ehExclusaoEstrutural =
      req.method === 'DELETE' && EXCLUSOES_ESTRUTURAIS.test(req.path);

    const ehImportacaoDestrutiva =
      req.method === 'POST' &&
      IMPORTACAO.test(req.path) &&
      (req.body as { substituir?: unknown } | undefined)?.substituir === true;

    if (ehExclusaoEstrutural || ehImportacaoDestrutiva) {
      res.status(403).json(falha(MENSAGEM, { modoDemonstracao: true }));
      return;
    }

    next();
  };
}
