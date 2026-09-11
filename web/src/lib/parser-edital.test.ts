import { describe, expect, test } from 'vitest';
import { agruparAnalise, analisarEdital } from './parser-edital.js';

/**
 * O parser existe para receber texto copiado de PDF de edital, que chega sujo:
 * paragrafo corrido, quebra de linha no meio da frase, numeracao de banca
 * variando. Ele nao precisa acertar sempre — a tela mostra uma previa editavel.
 * Precisa e nao inventar item nem engolir item.
 */
describe('analisarEdital — uma linha por item', () => {
  test('reconhece cabecalho de disciplina em caixa alta e os itens abaixo', () => {
    const itens = analisarEdital(`
      SEGURANÇA DA INFORMAÇÃO
      1.1 Conceitos de confidencialidade, integridade e disponibilidade.
      1.2 Criptografia simétrica e assimétrica.
      REDES DE COMPUTADORES
      2.1 Modelo OSI e TCP/IP.
    `);

    expect(itens).toEqual([
      { disciplina: 'SEGURANÇA DA INFORMAÇÃO', codigoEdital: '1.1', descricao: 'Conceitos de confidencialidade, integridade e disponibilidade.' },
      { disciplina: 'SEGURANÇA DA INFORMAÇÃO', codigoEdital: '1.2', descricao: 'Criptografia simétrica e assimétrica.' },
      { disciplina: 'REDES DE COMPUTADORES', codigoEdital: '2.1', descricao: 'Modelo OSI e TCP/IP.' },
    ]);
  });

  test('aceita cabecalho terminando em dois-pontos', () => {
    const itens = analisarEdital('Banco de Dados:\n5.1 Modelo relacional.');

    expect(itens[0]?.disciplina).toBe('Banco de Dados');
  });

  test('aceita numeracao de um nivel so e de tres niveis', () => {
    const itens = analisarEdital('REDES\n1 Fundamentos.\n7.4.2 Sub-item profundo.');

    expect(itens.map((i) => i.codigoEdital)).toEqual(['1', '7.4.2']);
  });

  test('aceita item separado por traco ou parentese', () => {
    const itens = analisarEdital('REDES\n1.1 - Modelo OSI.\n1.2) Endereçamento.');

    expect(itens.map((i) => i.descricao)).toEqual(['Modelo OSI.', 'Endereçamento.']);
  });
});

describe('analisarEdital — texto sujo de PDF', () => {
  test('junta a continuacao quebrada em outra linha', () => {
    const itens = analisarEdital(`
      SEGURANÇA
      1.1 Conceitos de confidencialidade, integridade
      e disponibilidade da informação.
    `);

    expect(itens).toHaveLength(1);
    expect(itens[0]?.descricao).toBe(
      'Conceitos de confidencialidade, integridade e disponibilidade da informação.',
    );
  });

  test('continuacao em caixa alta nao vira disciplina', () => {
    // Caso real de PDF: o item quebra antes de uma sigla, e a sigla sozinha na
    // linha parece um cabecalho de disciplina. O que decide e o item anterior
    // ter ficado sem pontuacao final — ele estava aberto.
    const itens = analisarEdital(`
      REDES
      3.2 Protocolos de aplicação: DNS, DHCP, HTTP e
      HTTPS.
      3.3 Análise de tráfego.
    `);

    expect(itens).toHaveLength(2);
    expect(itens[0]?.descricao).toBe('Protocolos de aplicação: DNS, DHCP, HTTP e HTTPS.');
    expect(itens.every((i) => i.disciplina === 'REDES')).toBe(true);
  });

  test('separa itens de um paragrafo corrido', () => {
    const itens = analisarEdital(
      'SEGURANÇA DA INFORMAÇÃO: 1 Conceitos básicos. 1.1 Confidencialidade. 1.2 Integridade.',
    );

    expect(itens).toEqual([
      { disciplina: 'SEGURANÇA DA INFORMAÇÃO', codigoEdital: '1', descricao: 'Conceitos básicos.' },
      { disciplina: 'SEGURANÇA DA INFORMAÇÃO', codigoEdital: '1.1', descricao: 'Confidencialidade.' },
      { disciplina: 'SEGURANÇA DA INFORMAÇÃO', codigoEdital: '1.2', descricao: 'Integridade.' },
    ]);
  });

  test('nao confunde numero dentro do texto com numeracao de item', () => {
    // "13.709/2018" e "802.11" sao conteudo, nao codigo de edital.
    const itens = analisarEdital(
      'LEGISLAÇÃO: 6.1 Lei nº 13.709/2018 (LGPD). 6.2 Padrões IEEE 802.11 aplicados.',
    );

    expect(itens.map((i) => i.codigoEdital)).toEqual(['6.1', '6.2']);
    expect(itens[0]?.descricao).toBe('Lei nº 13.709/2018 (LGPD).');
    expect(itens[1]?.descricao).toContain('802.11');
  });

  test('ignora linhas vazias e espacos sobrando', () => {
    const itens = analisarEdital('REDES\n\n\n   1.1    Modelo OSI.   \n\n');

    expect(itens).toEqual([
      { disciplina: 'REDES', codigoEdital: '1.1', descricao: 'Modelo OSI.' },
    ]);
  });
});

describe('analisarEdital — sem disciplina no texto', () => {
  test('usa a disciplina informada como padrao', () => {
    const itens = analisarEdital('1.1 Modelo OSI.\n1.2 IPv6.', 'Redes de Computadores');

    expect(itens.every((i) => i.disciplina === 'Redes de Computadores')).toBe(true);
  });

  test('item solto sem numeracao vira topico sem codigo, e nao disciplina', () => {
    // Uma linha sem numero e sem cara de titulo ainda e conteudo do edital:
    // engoli-la seria perder um item.
    const itens = analisarEdital('Redes:\n1.1 Modelo OSI.\nNoções de cabeamento estruturado.');

    expect(itens).toHaveLength(2);
    expect(itens[1]).toEqual({
      disciplina: 'Redes',
      codigoEdital: null,
      descricao: 'Noções de cabeamento estruturado.',
    });
  });

  test('texto vazio nao produz item nenhum', () => {
    expect(analisarEdital('   \n\n  ')).toEqual([]);
  });
});

describe('analisarEdital — duplicatas', () => {
  test('mantem os dois itens quando o codigo repete, para a previa sinalizar', () => {
    const itens = analisarEdital('REDES\n1.1 Primeiro.\n1.1 Segundo.');

    expect(itens).toHaveLength(2);
  });
});

describe('agruparAnalise', () => {
  test('agrupa por disciplina preservando a ordem de aparicao', () => {
    const grupos = agruparAnalise([
      { disciplina: 'Redes', codigoEdital: '1.1', descricao: 'a' },
      { disciplina: 'Segurança', codigoEdital: '2.1', descricao: 'b' },
      { disciplina: 'Redes', codigoEdital: '1.2', descricao: 'c' },
    ]);

    expect(grupos.map((g) => g.disciplina)).toEqual(['Redes', 'Segurança']);
    expect(grupos[0]?.itens).toHaveLength(2);
  });
});
