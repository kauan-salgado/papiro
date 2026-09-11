import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PreviaEdital } from '../components/importacao/PreviaEdital.js';
import { Botao } from '../components/ui/Botao.js';
import { Carregando } from '../components/ui/Carregando.js';
import { EstadoVazio } from '../components/ui/EstadoVazio.js';
import { useEdital } from '../hooks/useEdital.js';
import { useImportarEdital } from '../hooks/useImportacao.js';
import { ApiError } from '../lib/api.js';
import { agruparAnalise, analisarEdital, type ItemAnalisado } from '../lib/parser-edital.js';
import './paginas.css';

const EXEMPLO = `SEGURANÇA DA INFORMAÇÃO: 1 Conceitos de segurança. 1.1 Confidencialidade, integridade e disponibilidade.
REDES DE COMPUTADORES
2.1 Modelo OSI e arquitetura TCP/IP.
2.2 Protocolos de aplicação: DNS, DHCP, HTTP e HTTPS.`;

export function PaginaImportar() {
  const { cargoId = '0' } = useParams();
  const cargo = Number(cargoId);
  const navegar = useNavigate();

  const { data: edital } = useEdital(cargo);
  const importar = useImportarEdital(cargo);

  const [texto, setTexto] = useState('');
  const [disciplinaPadrao, setDisciplinaPadrao] = useState('');
  const [itens, setItens] = useState<ItemAnalisado[] | null>(null);
  const [substituir, setSubstituir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const jaTemEdital = (edital?.disciplinas.length ?? 0) > 0;

  function analisar() {
    setErro(null);
    setItens(analisarEdital(texto, disciplinaPadrao.trim() || 'Sem disciplina'));
  }

  function alterarItem(indice: number, campo: keyof ItemAnalisado, valor: string) {
    setItens((atuais) =>
      (atuais ?? []).map((item, posicao) =>
        posicao === indice
          ? { ...item, [campo]: campo === 'codigoEdital' && valor === '' ? null : valor }
          : item,
      ),
    );
  }

  function removerItem(indice: number) {
    setItens((atuais) => (atuais ?? []).filter((_, posicao) => posicao !== indice));
  }

  async function gravar() {
    if (!itens || itens.length === 0) {
      return;
    }

    setErro(null);

    try {
      await importar.mutateAsync({ itens, substituir });
      navegar(`/cargos/${cargo}/edital`);
    } catch (falha) {
      setErro(
        falha instanceof ApiError ? falha.message : 'Não foi possível importar o edital.',
      );
    }
  }

  if (cargo <= 0) {
    return <EstadoVazio titulo="Cargo inválido" descricao="Volte e escolha um edital." />;
  }

  const grupos = itens ? agruparAnalise(itens) : [];

  return (
    <>
      <section className="secao">
        <header className="secao__cabecalho">
          <h2 className="secao__titulo">Importar edital</h2>
          <p className="secao__subtitulo">
            Cole o texto do edital — o trecho de conhecimentos específicos, direto do PDF. Papiro
            reconhece a numeração e monta a lista; você confere e corrige antes de gravar.
          </p>
        </header>

        <div className="importar">
          <label className="campo">
            <span className="campo__rotulo">Texto do edital</span>
            <textarea
              className="campo__entrada importar__texto"
              rows={12}
              value={texto}
              placeholder={EXEMPLO}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          </label>

          <div className="importar__opcoes">
            <label className="campo">
              <span className="campo__rotulo">
                Disciplina padrão <span className="campo__opcional">(se o texto não trouxer)</span>
              </span>
              <input
                className="campo__entrada"
                value={disciplinaPadrao}
                placeholder="Ex.: Segurança da Informação"
                onChange={(evento) => setDisciplinaPadrao(evento.target.value)}
              />
            </label>

            <Botao type="button" onClick={analisar} disabled={texto.trim().length === 0}>
              Analisar texto
            </Botao>
          </div>
        </div>
      </section>

      {itens !== null && (
        <section className="secao">
          <header className="secao__cabecalho">
            <h2 className="secao__titulo">Conferência</h2>
            <p className="secao__subtitulo">
              {itens.length === 0
                ? 'Nenhum item reconhecido. Confira se o texto colado tem a numeração do edital.'
                : `${itens.length} itens em ${grupos.length} disciplinas. Edite o que o reconhecimento errou — nada foi gravado ainda.`}
            </p>
          </header>

          {itens.length > 0 && (
            <>
              <PreviaEdital itens={itens} aoAlterar={alterarItem} aoRemover={removerItem} />

              <div className="importar__acoes">
                {jaTemEdital && (
                  <label className="importar__substituir">
                    <input
                      type="checkbox"
                      checked={substituir}
                      onChange={(evento) => setSubstituir(evento.target.checked)}
                    />
                    <span>
                      Substituir o edital atual <strong>(apaga as sessões já registradas)</strong>
                    </span>
                  </label>
                )}

                <Botao type="button" onClick={gravar} disabled={importar.isPending}>
                  {importar.isPending ? 'Importando…' : `Importar ${itens.length} itens`}
                </Botao>
              </div>
            </>
          )}

          {erro && (
            <p className="formulario-sessao__erro" role="alert">
              {erro}
            </p>
          )}

          {importar.isPending && <Carregando linhas={1} rotulo="Gravando o edital" />}
        </section>
      )}

      <p className="importar__rodape">
        Prefere a linha de comando? <Link to={`/cargos/${cargo}/edital`}>Voltar ao edital</Link> — a
        mesma importação existe como <code>POST /api/cargos/{cargo}/edital/importar</code>.
      </p>
    </>
  );
}
