import type { ButtonHTMLAttributes } from 'react';
import './ui.css';

type Variante = 'primario' | 'sutil' | 'texto' | 'perigo';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variante?: Variante;
};

export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  return <button className={`botao botao--${variante} ${className}`.trim()} {...props} />;
}
