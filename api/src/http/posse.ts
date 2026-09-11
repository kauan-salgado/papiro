/**
 * Filtros de posse.
 *
 * Toda a hierarquia pende de `concursos.usuario_id`, entao autorizar e sempre
 * a mesma coisa: alcancar a raiz e comparar o dono. Estes filtros existem para
 * que essa travessia seja escrita UMA vez. Espalhada por vinte rotas, bastaria
 * esquecer uma para abrir um IDOR — o bug em que trocar o id na URL mostra o
 * dado de outra pessoa.
 *
 * Regra da casa: nenhuma consulta a concurso, cargo, disciplina, topico,
 * simulado ou sessao sai daqui sem um destes.
 */

export function filtroConcurso(usuarioId: number) {
  return { usuarioId };
}

export function filtroCargo(usuarioId: number) {
  return { concurso: { usuarioId } };
}

export function filtroDisciplina(usuarioId: number) {
  return { cargo: { concurso: { usuarioId } } };
}

export function filtroTopico(usuarioId: number) {
  return { disciplina: { cargo: { concurso: { usuarioId } } } };
}

export function filtroSessao(usuarioId: number) {
  return { topico: filtroTopico(usuarioId) };
}

export function filtroSimulado(usuarioId: number) {
  return { cargo: { concurso: { usuarioId } } };
}
