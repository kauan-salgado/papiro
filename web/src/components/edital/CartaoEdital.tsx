import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useExcluirEdital } from '../../hooks/useExcluirEdital.js';
import type { Cargo } from '../../types/api.js';
import { Botao } from '../ui/Botao.js';
import './cartao-edital.css';

type Props = {
  readonly cargo: Cargo;
  readonly somenteLeitura: boolean;
};

function emPortugues(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

export function CartaoEdital({ cargo, somenteLeitura }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const excluir = useExcluirEdital();

  const { topicos, sessoes } = cargo.totais;

  return (
    <li className="cartao" data-confirmando={confirmando}>
      <p className="cartao__banca">{cargo.concurso.banca ?? 'banca não informada'}</p>
      <h3 className="cartao__concurso">{cargo.concurso.nome}</h3>
      <p className="cartao__cargo">{cargo.nome}</p>

      <p className="cartao__numeros">
        <span>{emPortugues(cargo._count.disciplinas, 'disciplina', 'disciplinas')}</span>
        <span>{emPortugues(topicos, 'tópico', 'tópicos')}</span>
        <span>{emPortugues(sessoes, 'sessão', 'sessões')}</span>
      </p>

      {confirmando ? (
        <div className="cartao__confirmacao" role="alertdialog" aria-label="Confirmar exclusão">
          <p className="cartao__aviso">
            Apagar este edital remove <strong>{emPortugues(topicos, 'tópico', 'tópicos')}</strong>
            {sessoes > 0 && (
              <>
                {' '}e <strong>{emPortugues(sessoes, 'sessão de estudo', 'sessões de estudo')}</strong>
              </>
            )}
            . Não dá para desfazer.
          </p>

          {excluir.isError && (
            <p className="cartao__erro" role="alert">
              Não foi possível apagar. Tente de novo.
            </p>
          )}

          <div className="cartao__acoes">
            <Botao
              variante="sutil"
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={excluir.isPending}
            >
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              type="button"
              onClick={() => excluir.mutate(cargo.id)}
              disabled={excluir.isPending}
            >
              {excluir.isPending ? 'Apagando…' : 'Apagar edital'}
            </Botao>
          </div>
        </div>
      ) : (
        <div className="cartao__acoes">
          <Link className="cartao__acao" to={`/cargos/${cargo.id}/edital`}>
            Abrir edital
          </Link>
          <Link className="cartao__acao cartao__acao--sutil" to={`/cargos/${cargo.id}/dashboard`}>
            Ver desempenho
          </Link>

          {!somenteLeitura && (
            <Botao
              variante="perigo"
              type="button"
              className="cartao__apagar"
              onClick={() => setConfirmando(true)}
              aria-label={`Apagar o edital ${cargo.concurso.nome}`}
            >
              apagar
            </Botao>
          )}
        </div>
      )}
    </li>
  );
}
