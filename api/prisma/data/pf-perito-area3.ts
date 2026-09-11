import type { EditalSeed } from './tipos.js';

/**
 * DADOS DE EXEMPLO — aproximacao de um edital real, escrita para exercitar o
 * modelo enquanto a lista definitiva nao entra. Substitua `itens` pelos itens
 * literais do edital publicado, mantendo o formato
 * [disciplina, codigoEdital, descricao].
 *
 * Repare que "Deteccao de intrusao (IDS/IPS) e correlacao de eventos (SIEM)"
 * aparece aqui com o codigo 7.5 e no edital da DATAPREV com outro codigo e
 * outra redacao. Sao dois registros distintos de proposito: mesmo assunto,
 * editais diferentes, bancas diferentes.
 */
export const pfPeritoArea3: EditalSeed = {
  concurso: {
    nome: 'Polícia Federal — Perito Criminal Federal (exemplo)',
    banca: 'CEBRASPE',
    dataProva: null,
  },
  cargo: { nome: 'Área 3 — Computação / Tecnologia da Informação' },
  pesos: {
    'Segurança da Informação': 2,
    'Forense Computacional': 2,
    'Redes de Computadores': 1.5,
  },
  itens: [
    // --- Fundamentos de Computação -----------------------------------------
    { disciplina: 'Fundamentos de Computação', codigoEdital: '1.1', descricao: 'Arquitetura de computadores: organização de CPU, memória, barramentos e entrada/saída.' },
    { disciplina: 'Fundamentos de Computação', codigoEdital: '1.2', descricao: 'Representação de dados: sistemas de numeração, ponto flutuante e codificação de caracteres.' },
    { disciplina: 'Fundamentos de Computação', codigoEdital: '1.3', descricao: 'Teoria da computação: autômatos, linguagens formais e complexidade de algoritmos.' },
    { disciplina: 'Fundamentos de Computação', codigoEdital: '1.4', descricao: 'Compiladores: análise léxica, sintática e semântica; geração de código.' },

    // --- Algoritmos e Estruturas de Dados ----------------------------------
    { disciplina: 'Algoritmos e Estruturas de Dados', codigoEdital: '2.1', descricao: 'Estruturas lineares: vetores, listas encadeadas, pilhas e filas.' },
    { disciplina: 'Algoritmos e Estruturas de Dados', codigoEdital: '2.2', descricao: 'Árvores: binárias de busca, AVL, B e B+; heaps.' },
    { disciplina: 'Algoritmos e Estruturas de Dados', codigoEdital: '2.3', descricao: 'Tabelas hash: funções de espalhamento e tratamento de colisões.' },
    { disciplina: 'Algoritmos e Estruturas de Dados', codigoEdital: '2.4', descricao: 'Grafos: representação, busca em largura e profundidade, caminho mínimo.' },
    { disciplina: 'Algoritmos e Estruturas de Dados', codigoEdital: '2.5', descricao: 'Ordenação e pesquisa: análise de complexidade assintótica dos principais algoritmos.' },

    // --- Linguagens de Programação -----------------------------------------
    { disciplina: 'Linguagens de Programação', codigoEdital: '3.1', descricao: 'Programação estruturada e orientada a objetos: encapsulamento, herança e polimorfismo.' },
    { disciplina: 'Linguagens de Programação', codigoEdital: '3.2', descricao: 'Linguagem C: ponteiros, alocação dinâmica e gerenciamento manual de memória.' },
    { disciplina: 'Linguagens de Programação', codigoEdital: '3.3', descricao: 'Python: estruturas de dados nativas, bibliotecas padrão e automação de tarefas.' },
    { disciplina: 'Linguagens de Programação', codigoEdital: '3.4', descricao: 'Linguagem de montagem e engenharia reversa de binários.' },

    // --- Sistemas Operacionais ---------------------------------------------
    { disciplina: 'Sistemas Operacionais', codigoEdital: '4.1', descricao: 'Gerência de processos: escalonamento, concorrência, deadlock e sincronização.' },
    { disciplina: 'Sistemas Operacionais', codigoEdital: '4.2', descricao: 'Gerência de memória: paginação, segmentação e memória virtual.' },
    { disciplina: 'Sistemas Operacionais', codigoEdital: '4.3', descricao: 'Sistemas de arquivos: FAT, NTFS, ext4 e APFS; journaling e metadados.' },
    { disciplina: 'Sistemas Operacionais', codigoEdital: '4.4', descricao: 'Administração de sistemas Linux e Windows: permissões, serviços e registro de eventos.' },
    { disciplina: 'Sistemas Operacionais', codigoEdital: '4.5', descricao: 'Virtualização e contêineres: hipervisores, isolamento e implicações forenses.' },

    // --- Banco de Dados ------------------------------------------------------
    { disciplina: 'Banco de Dados', codigoEdital: '5.1', descricao: 'Modelo relacional: álgebra relacional, normalização e integridade referencial.' },
    { disciplina: 'Banco de Dados', codigoEdital: '5.2', descricao: 'SQL: consultas, junções, agregações, views e controle de transações.' },
    { disciplina: 'Banco de Dados', codigoEdital: '5.3', descricao: 'Transações e concorrência: propriedades ACID, isolamento e recuperação.' },
    { disciplina: 'Banco de Dados', codigoEdital: '5.4', descricao: 'Bancos NoSQL: modelos chave-valor, documento, colunar e de grafos.' },
    { disciplina: 'Banco de Dados', codigoEdital: '5.5', descricao: 'Recuperação de dados em bancos danificados e análise de artefatos de SGBD.' },

    // --- Redes de Computadores ----------------------------------------------
    { disciplina: 'Redes de Computadores', codigoEdital: '6.1', descricao: 'Modelos OSI e TCP/IP: encapsulamento e funções de cada camada.' },
    { disciplina: 'Redes de Computadores', codigoEdital: '6.2', descricao: 'Endereçamento IPv4 e IPv6, sub-redes, NAT e roteamento.' },
    { disciplina: 'Redes de Computadores', codigoEdital: '6.3', descricao: 'Protocolos de aplicação: DNS, DHCP, HTTP, HTTPS, SMTP e FTP.' },
    { disciplina: 'Redes de Computadores', codigoEdital: '6.4', descricao: 'Análise de tráfego e captura de pacotes com Wireshark e tcpdump.' },
    { disciplina: 'Redes de Computadores', codigoEdital: '6.5', descricao: 'Redes sem fio: padrões IEEE 802.11, autenticação e vulnerabilidades.' },

    // --- Segurança da Informação --------------------------------------------
    { disciplina: 'Segurança da Informação', codigoEdital: '7.1', descricao: 'Princípios de segurança: confidencialidade, integridade, disponibilidade e não repúdio.' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.2', descricao: 'Criptografia simétrica e assimétrica; funções de hash e assinatura digital.' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.3', descricao: 'Infraestrutura de chaves públicas (ICP-Brasil): certificados e cadeias de confiança.' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.4', descricao: 'Controle de acesso: autenticação, autorização, múltiplos fatores e federação de identidade.' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.5', descricao: 'Detecção de intrusão (IDS/IPS) e correlação de eventos de segurança (SIEM).' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.6', descricao: 'Ataques a aplicações web: injeção de SQL, XSS, CSRF e desserialização insegura.' },
    { disciplina: 'Segurança da Informação', codigoEdital: '7.7', descricao: 'Código malicioso: vírus, worms, trojans, ransomware e técnicas de ofuscação.' },

    // --- Forense Computacional -----------------------------------------------
    { disciplina: 'Forense Computacional', codigoEdital: '8.1', descricao: 'Cadeia de custódia: preservação, documentação e rastreabilidade da prova digital.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.2', descricao: 'Aquisição de dados: duplicação forense, bloqueadores de escrita e verificação por hash.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.3', descricao: 'Análise de mídias de armazenamento: recuperação de arquivos apagados e data carving.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.4', descricao: 'Forense de memória volátil: captura e análise de RAM.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.5', descricao: 'Forense em dispositivos móveis: extração lógica e física, sistemas Android e iOS.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.6', descricao: 'Análise de artefatos de navegação, registro do Windows e logs de sistema.' },
    { disciplina: 'Forense Computacional', codigoEdital: '8.7', descricao: 'Esteganografia e técnicas antiforense.' },
  ],
};
