export type ItemAnalisado = {
  readonly disciplina: string;
  readonly codigoEdital: string | null;
  readonly descricao: string;
};

export type GrupoAnalisado = {
  readonly disciplina: string;
  readonly itens: readonly ItemAnalisado[];
};

const DISCIPLINA_PADRAO = 'Sem disciplina';

/** "1", "1.1", "7.4.2" no comeco da linha, com separador opcional (-, ), .). */
const INICIO_DE_ITEM = /^(\d+(?:\.\d+)*)\s*[-–).]?\s+(.*)$/;

/**
 * Codigo de item dentro de um paragrafo corrido.
 *
 * Duas ancoras seguram os falsos positivos:
 *   1. o codigo so conta no inicio da linha ou logo depois de "." ":" "," ou
 *      ")" — e o que separa "6.2 Papeis do controlador" (item novo) de
 *      "Lei no 13.709/2018" (numero no meio da frase). Virgula e parentese
 *      entraram porque edital de verdade escreve "17.2 IPS (...), 17.3 SIEM";
 *   2. o texto seguinte precisa comecar em maiuscula — "802.11 aplicados a..."
 *      continua sendo conteudo, e "27001: sistema de gestao" tambem.
 */
const ITEM_NO_MEIO = /(?:^|(?<=[.:,)])\s+)(\d+(?:\.\d+)*)[.)]?\s+(?=\p{Lu})/gu;

/** Separador entre codigo e texto que algumas bancas usam: "1.1 - ", "1.2) ". */
const SEPARADOR_APOS_CODIGO = /^(\d+(?:\.\d+)*)\s*[-–)]\s+/;

/** Titulo de disciplina seguido de conteudo na mesma linha: "REDES: 1 Modelo OSI." */
const DISCIPLINA_COM_CONTEUDO = /^([\p{Lu}][\p{Lu}\s,\-/()]{3,}):\s*(\S.*)$/u;

/** Linha terminada em codigo solto — o PDF quebrou entre o numero e o texto. */
const CODIGO_ORFAO_NO_FIM = /\s\d+(?:\.\d+)*[.)]?$/;

/**
 * Junta as linhas que o PDF partiu no meio de um codigo. Sem isto, "… nomes. 6"
 * perde o item 6 inteiro: o numero fica sem texto e o texto fica sem numero.
 */
function costurarCodigosPartidos(linhas: readonly string[]): string[] {
  const costuradas: string[] = [];

  for (const linha of linhas) {
    const anterior = costuradas.at(-1);

    if (anterior !== undefined && CODIGO_ORFAO_NO_FIM.test(anterior)) {
      costuradas[costuradas.length - 1] = `${anterior} ${linha}`;
      continue;
    }

    costuradas.push(linha);
  }

  return costuradas;
}

/** Cabecalho de disciplina: linha sem numeracao, em caixa alta ou terminada em ":". */
function ehCabecalhoDeDisciplina(linha: string): boolean {
  if (INICIO_DE_ITEM.test(linha)) {
    return false;
  }

  if (linha.endsWith(':')) {
    return true;
  }

  const letras = linha.replace(/[^\p{L}]/gu, '');

  return letras.length > 0 && letras === letras.toUpperCase();
}

function limpar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/**
 * Quebra uma linha que traz varios itens em sequencia. Devolve uma lista com um
 * elemento por item; quando nao ha numeracao interna, devolve a linha inteira.
 */
function separarItensDaLinha(bruta: string): readonly { codigo: string | null; texto: string }[] {
  // Normaliza "1.1 - Texto" e "1.2) Texto" para "1.1 Texto" antes de procurar
  // os codigos: assim existe uma unica regra de reconhecimento.
  const linha = bruta.replace(SEPARADOR_APOS_CODIGO, '$1 ');
  const marcas = [...linha.matchAll(ITEM_NO_MEIO)];

  if (marcas.length === 0) {
    return [{ codigo: null, texto: linha }];
  }

  const preambulo = linha.slice(0, marcas[0]?.index ?? 0).trim();
  const itens = marcas.map((marca, indice) => {
    const inicio = (marca.index ?? 0) + marca[0].length;
    const fim = indice + 1 < marcas.length ? marcas[indice + 1]?.index : undefined;

    return { codigo: marca[1] ?? null, texto: linha.slice(inicio, fim).trim() };
  });

  // Texto antes do primeiro codigo (ex.: "SEGURANÇA:") volta como item sem codigo,
  // para quem chamou decidir se e cabecalho de disciplina.
  return preambulo ? [{ codigo: null, texto: preambulo }, ...itens] : itens;
}

/**
 * Converte texto colado de um edital em itens estruturados.
 *
 * Nao tenta ser infalivel: bancas numeram de formas diferentes e PDF quebra
 * linha no meio da frase. A tela mostra o resultado em uma previa editavel —
 * o parser so precisa poupar digitacao sem inventar nem engolir item.
 */
export function analisarEdital(texto: string, disciplinaPadrao = DISCIPLINA_PADRAO): ItemAnalisado[] {
  const itens: ItemAnalisado[] = [];
  let disciplinaAtual = disciplinaPadrao;

  const linhas = costurarCodigosPartidos(
    texto.split('\n').map(limpar).filter((linha) => linha.length > 0),
  );

  for (const linhaBruta of linhas) {
    let linha = linhaBruta;

    // "COMPUTAÇÃO EM NUVEM: Conceitos ..." — titulo e conteudo na mesma linha.
    const comConteudo = DISCIPLINA_COM_CONTEUDO.exec(linha);

    if (comConteudo?.[1] && comConteudo[2] && !INICIO_DE_ITEM.test(linha)) {
      disciplinaAtual = comConteudo[1].trim();
      linha = comConteudo[2];
    }

    for (const pedaco of separarItensDaLinha(linha)) {
      const conteudo = limpar(pedaco.texto);

      if (!conteudo) {
        continue;
      }

      if (pedaco.codigo === null) {
        const anterior = itens.at(-1);
        // Trecho que comeca em minuscula nunca inicia item nem disciplina: e
        // continuacao, mesmo que o item anterior tenha terminado em ":".
        const continuaFrase = /^\p{Ll}/u.test(conteudo);

        const itemAberto =
          anterior !== undefined &&
          anterior.disciplina === disciplinaAtual &&
          (continuaFrase || !/[.;:]$/.test(anterior.descricao));

        // Cabecalho terminado em ":" e inequivoco e interrompe qualquer item
        // aberto: em edital, uma disciplina nova costuma comecar logo depois de
        // um item que ficou sem ponto final.
        const ehCabecalhoInequivoco = conteudo.endsWith(':') && ehCabecalhoDeDisciplina(conteudo);

        // Fora esse caso, item aberto manda mais que aparencia de cabecalho: o
        // PDF quebra a frase no meio e, se ela quebrar antes de uma sigla, a
        // linha seguinte ("HTTPS.") parece um titulo em caixa alta sem ser um.
        if (itemAberto && !ehCabecalhoInequivoco) {
          itens[itens.length - 1] = {
            ...anterior,
            descricao: `${anterior.descricao} ${conteudo}`,
          };
          continue;
        }

        if (ehCabecalhoDeDisciplina(conteudo)) {
          disciplinaAtual = conteudo.replace(/:$/, '').trim();
          continue;
        }

        itens.push({ disciplina: disciplinaAtual, codigoEdital: null, descricao: conteudo });
        continue;
      }

      const separado = INICIO_DE_ITEM.exec(`${pedaco.codigo} ${conteudo}`);

      itens.push({
        disciplina: disciplinaAtual,
        codigoEdital: pedaco.codigo,
        descricao: limpar(separado?.[2] ?? conteudo),
      });
    }
  }

  return itens;
}

export function agruparAnalise(itens: readonly ItemAnalisado[]): GrupoAnalisado[] {
  const ordem: string[] = [];
  const porDisciplina = new Map<string, ItemAnalisado[]>();

  for (const item of itens) {
    if (!porDisciplina.has(item.disciplina)) {
      porDisciplina.set(item.disciplina, []);
      ordem.push(item.disciplina);
    }

    porDisciplina.get(item.disciplina)?.push(item);
  }

  return ordem.map((disciplina) => ({
    disciplina,
    itens: porDisciplina.get(disciplina) ?? [],
  }));
}

/** Codigos repetidos dentro da mesma disciplina — o banco recusaria o segundo. */
export function codigosDuplicados(itens: readonly ItemAnalisado[]): ReadonlySet<string> {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();

  for (const item of itens) {
    if (item.codigoEdital === null) {
      continue;
    }

    const chave = `${item.disciplina}|${item.codigoEdital}`;

    if (vistos.has(chave)) {
      repetidos.add(chave);
    }

    vistos.add(chave);
  }

  return repetidos;
}
