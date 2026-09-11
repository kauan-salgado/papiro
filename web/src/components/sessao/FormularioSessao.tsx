import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../lib/api.js';
import {
  useRegistrarSessao,
  useSimulados,
  type Alvo,
  type NovaSessao,
} from '../../hooks/useSessoes.js';
import { ROTULO_TIPO_ESTUDO, TIPOS_DE_ESTUDO, type TipoEstudo } from '../../types/api.js';
import { Botao } from '../ui/Botao.js';
import { CamposDeQuestoes } from './CamposDeQuestoes.js';
import {
  CAMPOS_DE_QUESTOES,
  hojeISO,
  sessaoFormSchema,
  type SessaoFormEntrada,
  type SessaoFormSaida,
} from './sessao.schema.js';
import './sessao.css';

type Props = {
  /** Item do edital, materia inteira ou prova — o formulario e o mesmo. */
  readonly alvo: Alvo;
  readonly cargoId: number;
};

const VALORES_INICIAIS: SessaoFormEntrada = {
  data: hojeISO(),
  tempoMinutos: undefined,
  tipoEstudo: 'Teoria',
  simuladoId: '',
  observacoes: '',
  questoesAcertadas: undefined,
  questoesErradas: undefined,
  questoesBrancas: undefined,
};

export function FormularioSessao({ alvo, cargoId }: Props) {
  const registrar = useRegistrarSessao(cargoId, alvo);
  const { data: simulados = [] } = useSimulados(cargoId);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SessaoFormEntrada, unknown, SessaoFormSaida>({
    resolver: zodResolver(sessaoFormSchema),
    defaultValues: VALORES_INICIAIS,
  });

  const tipoEstudo = watch('tipoEstudo') as TipoEstudo;
  const ehQuestoes = tipoEstudo === 'Questoes';

  // Trocar de "Questoes" para outro tipo precisa limpar os contadores: deixa-los
  // preenchidos faria o backend (e o CHECK do banco) recusarem a sessao.
  useEffect(() => {
    if (!ehQuestoes) {
      for (const campo of CAMPOS_DE_QUESTOES) {
        resetField(campo, { defaultValue: undefined });
      }
    }
  }, [ehQuestoes, resetField]);

  const aoEnviar = handleSubmit(async (valores) => {
    const sessao: NovaSessao = {
      // Exatamente um alvo: o backend deriva os niveis acima e recusa combinacao.
      ...(alvo.tipo === 'topico' && { topicoId: alvo.id }),
      ...(alvo.tipo === 'disciplina' && { disciplinaId: alvo.id }),
      ...(alvo.tipo === 'cargo' && { cargoId: alvo.id }),
      data: valores.data,
      tempoMinutos: valores.tempoMinutos,
      tipoEstudo: valores.tipoEstudo as TipoEstudo,
      simuladoId: valores.simuladoId ? Number(valores.simuladoId) : null,
      observacoes: valores.observacoes?.trim() ? valores.observacoes.trim() : null,
      questoesAcertadas: valores.questoesAcertadas ?? null,
      questoesErradas: valores.questoesErradas ?? null,
      questoesBrancas: valores.questoesBrancas ?? null,
    };

    try {
      await registrar.mutateAsync(sessao);
      reset({ ...VALORES_INICIAIS, data: valores.data, tipoEstudo: valores.tipoEstudo });
    } catch (erro) {
      // O backend tambem valida — inclusive o CHECK constraint do Postgres, que
      // chega aqui como 400 com erro por campo. Se o front e o banco um dia
      // discordarem, a mensagem do banco aparece no campo certo em vez de virar
      // um "erro inesperado".
      if (erro instanceof ApiError) {
        for (const [campo, mensagens] of Object.entries(erro.fieldErrors)) {
          setError(campo as keyof SessaoFormEntrada, { message: mensagens[0] });
        }

        setError('root', { message: erro.message });
        return;
      }

      setError('root', { message: 'Nao foi possivel registrar a sessao.' });
    }
  });

  return (
    <form className="formulario-sessao" onSubmit={aoEnviar} noValidate>
      <div className="formulario-sessao__linha">
        <label className="campo campo--data">
          <span className="campo__rotulo">Data</span>
          <input type="date" className="campo__entrada" {...register('data')} />
          {errors.data && <span className="campo__erro">{errors.data.message}</span>}
        </label>

        <label className="campo campo--tempo">
          <span className="campo__rotulo">Tempo (min)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="45"
            className="campo__entrada"
            aria-invalid={errors.tempoMinutos ? true : undefined}
            {...register('tempoMinutos', { valueAsNumber: true })}
          />
          {errors.tempoMinutos && (
            <span className="campo__erro">{errors.tempoMinutos.message}</span>
          )}
        </label>
      </div>

      <fieldset className="formulario-sessao__tipos">
        <legend className="campo__rotulo">Tipo de estudo</legend>
        <div className="segmentado">
          {TIPOS_DE_ESTUDO.map((tipo) => (
            <label key={tipo} className="segmentado__opcao">
              <input type="radio" value={tipo} {...register('tipoEstudo')} />
              <span>{ROTULO_TIPO_ESTUDO[tipo]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {ehQuestoes && <CamposDeQuestoes register={register} errors={errors} />}

      <div className="formulario-sessao__linha">
        <label className="campo">
          <span className="campo__rotulo">
            Simulado <span className="campo__opcional">(opcional)</span>
          </span>
          <select className="campo__entrada" {...register('simuladoId')}>
            <option value="">Sessão avulsa</option>
            {simulados.map((simulado) => (
              <option key={simulado.id} value={simulado.id}>
                {simulado.nome} · {simulado.data}
              </option>
            ))}
          </select>
        </label>

        <label className="campo campo--observacoes">
          <span className="campo__rotulo">
            Observações <span className="campo__opcional">(opcional)</span>
          </span>
          <input
            type="text"
            className="campo__entrada"
            placeholder="Onde travou, o que revisar…"
            {...register('observacoes')}
          />
        </label>
      </div>

      {errors.root && (
        <p className="formulario-sessao__erro" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="formulario-sessao__acoes">
        <Botao type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando…' : 'Registrar sessão'}
        </Botao>
      </div>
    </form>
  );
}
