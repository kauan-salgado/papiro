import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Botao } from '../components/ui/Botao.js';
import { useCriarEdital } from '../hooks/useImportacao.js';
import { ApiError } from '../lib/api.js';
import './paginas.css';

/**
 * Porta de entrada de um edital novo. Sao dois registros (concurso e cargo),
 * mas um so passo para quem usa: quem esta cadastrando "PF — Perito Área 3"
 * nao pensa nisso como duas entidades.
 */
export function PaginaNovoEdital() {
  const criar = useCriarEdital();
  const navegar = useNavigate();

  const [concurso, setConcurso] = useState('');
  const [banca, setBanca] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [cargo, setCargo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const podeEnviar = concurso.trim().length >= 3 && cargo.trim().length >= 2;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    try {
      const criado = await criar.mutateAsync({ concurso, banca, dataProva, cargo });
      // Leva direto para a importacao: cadastrar o cargo sem o edital nao serve
      // para nada, e essa e a proxima coisa que a pessoa quer fazer.
      navegar(`/cargos/${criado.id}/importar`);
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Não foi possível criar o edital.');
    }
  }

  return (
    <section className="secao">
      <header className="secao__cabecalho">
        <h2 className="secao__titulo">Novo edital</h2>
        <p className="secao__subtitulo">
          Cadastre o concurso e o cargo. No passo seguinte você cola o texto do edital.
        </p>
      </header>

      <form className="formulario-sessao" onSubmit={enviar} noValidate>
        <div className="formulario-sessao__linha">
          <label className="campo campo--observacoes">
            <span className="campo__rotulo">Concurso</span>
            <input
              className="campo__entrada"
              value={concurso}
              placeholder="Ex.: Concurso de Analista de TI 2027"
              onChange={(evento) => setConcurso(evento.target.value)}
            />
          </label>

          <label className="campo">
            <span className="campo__rotulo">
              Banca <span className="campo__opcional">(opcional)</span>
            </span>
            <input
              className="campo__entrada"
              value={banca}
              placeholder="Nome da banca"
              onChange={(evento) => setBanca(evento.target.value)}
            />
          </label>
        </div>

        <div className="formulario-sessao__linha">
          <label className="campo campo--observacoes">
            <span className="campo__rotulo">Cargo</span>
            <input
              className="campo__entrada"
              value={cargo}
              placeholder="Ex.: Analista de Infraestrutura"
              onChange={(evento) => setCargo(evento.target.value)}
            />
          </label>

          <label className="campo campo--data">
            <span className="campo__rotulo">
              Data da prova <span className="campo__opcional">(opcional)</span>
            </span>
            <input
              type="date"
              className="campo__entrada"
              value={dataProva}
              onChange={(evento) => setDataProva(evento.target.value)}
            />
          </label>
        </div>

        {erro && (
          <p className="formulario-sessao__erro" role="alert">
            {erro}
          </p>
        )}

        <div className="formulario-sessao__acoes">
          <Botao type="submit" disabled={!podeEnviar || criar.isPending}>
            {criar.isPending ? 'Criando…' : 'Criar e colar o edital'}
          </Botao>
        </div>
      </form>
    </section>
  );
}
