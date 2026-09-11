import type { ReactNode } from 'react';
import './ui.css';

type Props = {
  readonly titulo: string;
  readonly descricao?: string;
  readonly acao?: ReactNode;
};

export function EstadoVazio({ titulo, descricao, acao }: Props) {
  return (
    <div className="estado-vazio">
      <p className="estado-vazio__titulo">{titulo}</p>
      {descricao && <p className="estado-vazio__descricao">{descricao}</p>}
      {acao}
    </div>
  );
}
