import { Router } from 'express';
import { cargosRoutes } from './modules/cargos/cargos.routes.js';
import { concursosRoutes } from './modules/concursos/concursos.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { disciplinasRoutes } from './modules/disciplinas/disciplinas.routes.js';
import { sessoesRoutes } from './modules/sessoes/sessoes.routes.js';
import { simuladosRoutes } from './modules/simulados/simulados.routes.js';
import { topicosRoutes } from './modules/topicos/topicos.routes.js';
import { healthRoutes } from './routes/health.routes.js';

export const routes = Router();

routes.use(healthRoutes);
routes.use('/concursos', concursosRoutes);
routes.use('/cargos', cargosRoutes);
routes.use('/disciplinas', disciplinasRoutes);
routes.use('/topicos', topicosRoutes);
routes.use('/simulados', simuladosRoutes);
routes.use('/sessoes', sessoesRoutes);
routes.use('/dashboard', dashboardRoutes);
