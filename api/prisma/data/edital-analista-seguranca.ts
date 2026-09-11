import type { EditalSeed } from './tipos.js';

/**
 * DADOS DE EXEMPLO — mesma ressalva do edital da PF: aproximacao para exercitar
 * o modelo, a ser substituida pelos itens literais do edital publicado.
 *
 * Este edital cobre varios assuntos que tambem caem na PF, mas com numeracao e
 * redacao proprias (compare o item 3.4 daqui com o 7.5 do edital da PF). Por
 * isso Concurso e o nivel raiz do modelo: sem ele, os dois viravam um registro
 * so e o percentual de acerto de um edital contaminaria o do outro.
 */
export const editalAnalistaSeguranca: EditalSeed = {
  concurso: {
    nome: 'Concurso de Analista de TI — Segurança (exemplo)',
    banca: 'Banca Beta',
    dataProva: null,
  },
  cargo: { nome: 'Perfil de Segurança da Informação' },
  pesos: {
    'Gestão de Segurança da Informação': 2,
    'Segurança de Redes': 1.5,
  },
  itens: [
    // --- Gestão de Segurança da Informação ---------------------------------
    { disciplina: 'Gestão de Segurança da Informação', codigoEdital: '1.1', descricao: 'Norma ABNT NBR ISO/IEC 27001: sistema de gestão de segurança da informação.' },
    { disciplina: 'Gestão de Segurança da Informação', codigoEdital: '1.2', descricao: 'Norma ABNT NBR ISO/IEC 27002: controles de segurança da informação.' },
    { disciplina: 'Gestão de Segurança da Informação', codigoEdital: '1.3', descricao: 'Política de segurança da informação: elaboração, divulgação e conformidade.' },
    { disciplina: 'Gestão de Segurança da Informação', codigoEdital: '1.4', descricao: 'Classificação da informação e tratamento de ativos.' },
    { disciplina: 'Gestão de Segurança da Informação', codigoEdital: '1.5', descricao: 'Gestão de incidentes de segurança: detecção, resposta, contenção e lições aprendidas.' },

    // --- Gestão de Riscos e Continuidade ------------------------------------
    { disciplina: 'Gestão de Riscos e Continuidade', codigoEdital: '2.1', descricao: 'Norma ABNT NBR ISO/IEC 27005: processo de gestão de riscos de segurança da informação.' },
    { disciplina: 'Gestão de Riscos e Continuidade', codigoEdital: '2.2', descricao: 'Identificação, análise, avaliação e tratamento de riscos.' },
    { disciplina: 'Gestão de Riscos e Continuidade', codigoEdital: '2.3', descricao: 'Continuidade de negócios: análise de impacto (BIA), RTO e RPO.' },
    { disciplina: 'Gestão de Riscos e Continuidade', codigoEdital: '2.4', descricao: 'Plano de recuperação de desastres e estratégias de backup.' },

    // --- Segurança de Redes ---------------------------------------------------
    { disciplina: 'Segurança de Redes', codigoEdital: '3.1', descricao: 'Arquitetura de rede segura: segmentação, DMZ e defesa em profundidade.' },
    { disciplina: 'Segurança de Redes', codigoEdital: '3.2', descricao: 'Firewalls: filtragem de pacotes, inspeção de estado e firewall de próxima geração.' },
    { disciplina: 'Segurança de Redes', codigoEdital: '3.3', descricao: 'Redes privadas virtuais (VPN): IPsec e TLS.' },
    { disciplina: 'Segurança de Redes', codigoEdital: '3.4', descricao: 'Sistemas de detecção e prevenção de intrusão (IDS/IPS) e monitoramento centralizado de eventos (SIEM).' },
    { disciplina: 'Segurança de Redes', codigoEdital: '3.5', descricao: 'Ataques de negação de serviço distribuída (DDoS) e técnicas de mitigação.' },
    { disciplina: 'Segurança de Redes', codigoEdital: '3.6', descricao: 'Segurança de serviços de rede: DNS, DHCP e correio eletrônico.' },

    // --- Criptografia ----------------------------------------------------------
    { disciplina: 'Criptografia', codigoEdital: '4.1', descricao: 'Criptografia simétrica: AES, modos de operação e gerenciamento de chaves.' },
    { disciplina: 'Criptografia', codigoEdital: '4.2', descricao: 'Criptografia assimétrica: RSA, curvas elípticas e troca de chaves Diffie-Hellman.' },
    { disciplina: 'Criptografia', codigoEdital: '4.3', descricao: 'Funções de hash criptográfico e códigos de autenticação de mensagem (HMAC).' },
    { disciplina: 'Criptografia', codigoEdital: '4.4', descricao: 'Certificados digitais, autoridades certificadoras e protocolo TLS.' },

    // --- Desenvolvimento Seguro -------------------------------------------------
    { disciplina: 'Desenvolvimento Seguro', codigoEdital: '5.1', descricao: 'OWASP Top 10: principais riscos de segurança em aplicações web.' },
    { disciplina: 'Desenvolvimento Seguro', codigoEdital: '5.2', descricao: 'Validação de entrada, codificação de saída e prevenção de injeção.' },
    { disciplina: 'Desenvolvimento Seguro', codigoEdital: '5.3', descricao: 'Autenticação e gerenciamento de sessão: tokens, OAuth 2.0 e OpenID Connect.' },
    { disciplina: 'Desenvolvimento Seguro', codigoEdital: '5.4', descricao: 'Segurança em APIs REST e proteção de microsserviços.' },
    { disciplina: 'Desenvolvimento Seguro', codigoEdital: '5.5', descricao: 'Análise estática e dinâmica de código; segurança na esteira de CI/CD.' },

    // --- Legislação e Privacidade -------------------------------------------------
    { disciplina: 'Legislação e Privacidade', codigoEdital: '6.1', descricao: 'Lei nº 13.709/2018 (LGPD): fundamentos, bases legais e direitos do titular.' },
    { disciplina: 'Legislação e Privacidade', codigoEdital: '6.2', descricao: 'Papéis de controlador, operador e encarregado; relatório de impacto à proteção de dados.' },
    { disciplina: 'Legislação e Privacidade', codigoEdital: '6.3', descricao: 'Marco Civil da Internet (Lei nº 12.965/2014) e guarda de registros de conexão.' },
    { disciplina: 'Legislação e Privacidade', codigoEdital: '6.4', descricao: 'Privacidade desde a concepção e anonimização de dados pessoais.' },
  ],
};
