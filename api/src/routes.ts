import { Router } from 'express';
import { env } from './env.js';
import { carregarUsuario, exigirLogin } from './middlewares/autenticacao.js';
import { modoDemonstracao } from './middlewares/modo-demo.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { cargosRoutes } from './modules/cargos/cargos.routes.js';
import { concursosRoutes } from './modules/concursos/concursos.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { exemplosRoutes } from './modules/exemplos/exemplos.routes.js';
import { disciplinasRoutes } from './modules/disciplinas/disciplinas.routes.js';
import { sessoesRoutes } from './modules/sessoes/sessoes.routes.js';
import { simuladosRoutes } from './modules/simulados/simulados.routes.js';
import { topicosRoutes } from './modules/topicos/topicos.routes.js';
import { healthRoutes } from './routes/health.routes.js';

/**
 * A flag entra por parametro, com o ambiente como padrao: o teste liga e
 * desliga o modo demonstracao sem precisar mexer em variavel de processo.
 */
export function criarRotas({ modoDemo = env.MODO_DEMO }: { modoDemo?: boolean } = {}) {
  const routes = Router();

  // Antes de qualquer rota: em demonstracao publica, nada de apagar edital.
  routes.use(modoDemonstracao(modoDemo));

  // Identifica quem esta pedindo (sem barrar), para que ate as rotas publicas
  // saibam se ha alguem logado.
  routes.use(carregarUsuario);

  // Publicas: sonda de saude e o proprio fluxo de login.
  routes.use(healthRoutes);
  routes.use(authRoutes);

  // Daqui para baixo, tudo exige sessao. A linha e unica de proposito: rota
  // nova nasce protegida, em vez de depender de alguem lembrar do middleware.
  routes.use(exigirLogin);

  routes.use('/concursos', concursosRoutes);
  routes.use('/cargos', cargosRoutes);
  routes.use('/disciplinas', disciplinasRoutes);
  routes.use('/topicos', topicosRoutes);
  routes.use('/simulados', simuladosRoutes);
  routes.use('/sessoes', sessoesRoutes);
  routes.use('/dashboard', dashboardRoutes);
  routes.use('/exemplos', exemplosRoutes);

  return routes;
}
