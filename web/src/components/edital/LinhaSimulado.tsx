import { PainelDeRegistro } from './PainelDeRegistro.js';
import './edital.css';

type Props = {
  readonly cargoId: number;
  readonly aberto: boolean;
  readonly aoAlternar: () => void;
};

/**
 * Registro da prova inteira, no topo do edital.
 *
 * Um simulado nao pertence a disciplina nenhuma: obrigar a escolher uma
 * sujaria a estatistica dela com um tempo que era de todas. Aqui a sessao fica
 * no nivel do cargo.
 */
export function LinhaSimulado({ cargoId, aberto, aoAlternar }: Props) {
  const painelId = 'painel-simulado';

  return (
    <section className="simulado" data-aberto={aberto}>
      <button
        type="button"
        className="simulado__gatilho"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={aoAlternar}
      >
        <span className="simulado__rotulo">Simulado</span>
        <span className="simulado__descricao">
          Registre a prova inteira de uma vez — tempo total e placar geral
        </span>
        <span className="simulado__acao">{aberto ? 'fechar' : 'registrar'}</span>
      </button>

      {aberto && (
        <div className="simulado__painel" id={painelId}>
          <PainelDeRegistro
            alvo={{ tipo: 'cargo', id: cargoId }}
            cargoId={cargoId}
            convite="Aqui entra o simulado inteiro, sem separar por matéria."
            textoVazio="Nenhum simulado registrado ainda."
          />
        </div>
      )}
    </section>
  );
}
