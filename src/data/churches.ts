export interface Igreja {
  id: number;
  nome: string;
  distribuicao: string;
}

export const igrejas: Igreja[] = [
  { id: 1, nome: "Eldorado", distribuicao: "VALTER / ENÉIAS" },
  { id: 2, nome: "G. Campos", distribuicao: "VALTER / ENÉIAS" },
  { id: 3, nome: "Jd. Estrela", distribuicao: "VALTER / ENÉIAS" },
  { id: 4, nome: "Pq. Industrial", distribuicao: "VALTER / ENÉIAS" },
  { id: 5, nome: "Jd. Braga", distribuicao: "VALTER / ENÉIAS" },
  { id: 6, nome: "Cidadania", distribuicao: "VALTER / ENÉIAS" },
  { id: 7, nome: "Bela Vista", distribuicao: "VALTER / ENÉIAS" },

  { id: 8, nome: "Ipigua", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 9, nome: "Santa Ana", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 10, nome: "Floresta Parque", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 11, nome: "Jd. Jaguare", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 12, nome: "S. Felicio", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 13, nome: "São Pedro", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 14, nome: "Santa Clara", distribuicao: "MARCELO / WALDOMIRO" },
  { id: 15, nome: "Cidade Alta (N. Esperança)", distribuicao: "MARCELO / WALDOMIRO" },

  { id: 16, nome: "Central", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 17, nome: "Vila Imperial Benjamim", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 18, nome: "Solo Sagrado", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 19, nome: "Jd. Alice", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 20, nome: "Sto. Antônio", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 21, nome: "Cond. Alvorada", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 22, nome: "Jd. Maracanã", distribuicao: "FABIO / MAURO DOMINGUES" },

  { id: 23, nome: "Jd. Caetano", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 24, nome: "Hospedaria", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 25, nome: "Jd. Urano", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 26, nome: "Jd. S. Francisco", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 27, nome: "Cond. Navarrete", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 28, nome: "Cidade Jardim", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 29, nome: "Luz da Esperança", distribuicao: "ELIABE / EDUARDO / RAQUEL" },

  { id: 30, nome: "Maquininha", distribuicao: "JAQUELINE" },
  { id: 31, nome: "Talhado", distribuicao: "JAQUELINE" },
  { id: 32, nome: "Planalto", distribuicao: "JAQUELINE" },
  { id: 33, nome: "São Tomaz (Cond. N. S. Aparecida)", distribuicao: "JAQUELINE" },
  { id: 34, nome: "Cond. Todos os Santos", distribuicao: "JAQUELINE" },
  { id: 35, nome: "Res. Doca Vetorazo", distribuicao: "JAQUELINE" },
  { id: 36, nome: "Sala de Costura", distribuicao: "JAQUELINE" },
  { id: 37, nome: "Marialda Mello", distribuicao: "JAQUELINE" },

  { id: 38, nome: "Eng. Schmidt", distribuicao: "DEBORA" },
  { id: 39, nome: "Vila Toninho", distribuicao: "DEBORA" },
  { id: 40, nome: "Cristo Rei", distribuicao: "DEBORA" },
  { id: 41, nome: "Amoras II", distribuicao: "DEBORA" },
  { id: 42, nome: "Santa Maria", distribuicao: "DEBORA" },
  { id: 43, nome: "São Carlos", distribuicao: "DEBORA" },
  { id: 44, nome: "Maria Serante", distribuicao: "DEBORA" },
  { id: 45, nome: "Parque da Fraternidade", distribuicao: "DEBORA" },
];

export const tiposFormulario = [
  "14.1 Declaração de bens móveis",
  "14.2 Ocorrência de entrada de bens móveis",
  "14.3 Declaração saída de bens móveis",
  "14.4 Declaração de retirada de bens",
  "14.5 Ata de inventário de bens móveis",
  "14.6 Alteração de cadastro de bens",
  "14.7 Movimentação interna de bens",
  "14.8 Movimento mensal de bens",
  "Declaração de bens móveis N.F",
];

export const distribuicoes = [
  "VALTER / ENÉIAS",
  "MARCELO / WALDOMIRO",
  "FABIO / MAURO DOMINGUES",
  "ELIABE / EDUARDO / RAQUEL",
  "JAQUELINE",
  "DEBORA",
];
