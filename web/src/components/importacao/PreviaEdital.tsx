import { agruparAnalise, codigosDuplicados, type ItemAnalisado } from '../../lib/parser-edital.js';
import { Botao } from '../ui/Botao.js';
import './importacao.css';

type Props = {
  readonly itens: readonly ItemAnalisado[];
  readonly aoAlterar: (indice: number, campo: keyof ItemAnalisado, valor: string) => void;
  readonly aoRemover: (indice: number) => void;
};

/**
 * Previa editavel do que o parser entendeu.
 *
 * Ela existe porque nenhum parser acerta todos os editais: bancas numeram de
 * jeitos diferentes e PDF quebra frase no meio. Em vez de prometer magica, a
 * tela mostra o resultado e deixa corrigir antes de gravar — errar aqui custa
 * uma correcao; errar depois de gravar custa uma limpeza no banco.
 */
export function PreviaEdital({ itens, aoAlterar, aoRemover }: Props) {
  const duplicados = codigosDuplicados(itens);
  const grupos = agruparAnalise(itens);

  // Indice global de cada item, para o formulario saber qual linha alterar.
  const indicePorItem = new Map(itens.map((item, indice) => [item, indice]));

  return (
    <div className="previa">
      {grupos.map((grupo) => (
        <section key={grupo.disciplina} className="previa__grupo">
          <h3 className="previa__disciplina">
            {grupo.disciplina}
            <span className="previa__contagem">{grupo.itens.length}</span>
          </h3>

          <ol className="previa__itens">
            {grupo.itens.map((item) => {
              const indice = indicePorItem.get(item) ?? 0;
              const duplicado =
                item.codigoEdital !== null &&
                duplicados.has(`${item.disciplina}|${item.codigoEdital}`);

              return (
                <li key={indice} className="previa__item" data-duplicado={duplicado}>
                  <input
                    className="previa__codigo"
                    value={item.codigoEdital ?? ''}
                    placeholder="—"
                    aria-label={`Código do item ${indice + 1}`}
                    onChange={(evento) => aoAlterar(indice, 'codigoEdital', evento.target.value)}
                  />

                  <input
                    className="previa__descricao"
                    value={item.descricao}
                    aria-label={`Descrição do item ${indice + 1}`}
                    onChange={(evento) => aoAlterar(indice, 'descricao', evento.target.value)}
                  />

                  <input
                    className="previa__disciplina-campo"
                    value={item.disciplina}
                    aria-label={`Disciplina do item ${indice + 1}`}
                    onChange={(evento) => aoAlterar(indice, 'disciplina', evento.target.value)}
                  />

                  <Botao
                    variante="perigo"
                    type="button"
                    aria-label={`Remover item ${indice + 1}`}
                    onClick={() => aoRemover(indice)}
                  >
                    remover
                  </Botao>

                  {duplicado && (
                    <p className="previa__aviso">
                      Código repetido nesta disciplina — o banco recusaria o segundo.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
