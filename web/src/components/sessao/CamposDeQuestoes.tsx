import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { SessaoFormEntrada } from './sessao.schema.js';

type Props = {
  readonly register: UseFormRegister<SessaoFormEntrada>;
  readonly errors: FieldErrors<SessaoFormEntrada>;
};

const CAMPOS = [
  { nome: 'questoesAcertadas', rotulo: 'Acertadas' },
  { nome: 'questoesErradas', rotulo: 'Erradas' },
  { nome: 'questoesBrancas', rotulo: 'Em branco' },
] as const;

/**
 * Bloco que so existe quando o tipo de estudo e "Questoes" — a parte dinamica
 * do formulario. Sai do DOM quando o tipo muda, e o valor dos campos e limpado
 * junto (ver FormularioSessao), senao o backend recusaria a sessao.
 */
export function CamposDeQuestoes({ register, errors }: Props) {
  return (
    <fieldset className="formulario-sessao__questoes">
      <legend className="formulario-sessao__legenda">Questões resolvidas</legend>

      <div className="formulario-sessao__trio">
        {CAMPOS.map((campo) => (
          <label key={campo.nome} className="campo">
            <span className="campo__rotulo">{campo.rotulo}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="campo__entrada"
              aria-invalid={errors[campo.nome] ? true : undefined}
              {...register(campo.nome, { valueAsNumber: true })}
            />
            {errors[campo.nome] && (
              <span className="campo__erro">{errors[campo.nome]?.message}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
