import type { ReactNode } from 'react';
import './ui.css';

type Props = {
  readonly children: ReactNode;
  readonly faixa?: 'sem-dados' | 'critico' | 'atencao' | 'bom' | 'neutro';
  readonly titulo?: string;
};

/** Selo tipografico, no espirito de carimbo de documento. */
export function Selo({ children, faixa = 'neutro', titulo }: Props) {
  return (
    <span className="selo" data-faixa={faixa} title={titulo}>
      {children}
    </span>
  );
}
