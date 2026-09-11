import './ui.css';

type Props = { readonly linhas?: number; readonly rotulo?: string };

/** Esqueleto de carregamento com a altura das linhas reais, para nao pular layout. */
export function Carregando({ linhas = 3, rotulo = 'Carregando…' }: Props) {
  return (
    <div className="carregando" role="status" aria-label={rotulo}>
      {Array.from({ length: linhas }, (_, indice) => (
        <span key={indice} className="carregando__linha" />
      ))}
    </div>
  );
}
