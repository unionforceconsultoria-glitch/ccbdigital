export interface Igreja {
  id: number;
  nome: string;
  distribuicao: string;
}

export const igrejas: Igreja[] = [
  { id: 1, nome: "Eldorado", distribuicao: "VALTER / ENEIAS" },
  { id: 2, nome: "C. Campos", distribuicao: "VALTER / ENEIAS" },
  { id: 3, nome: "Jd. Estrela", distribuicao: "VALTER / ENEIAS" },
  { id: 4, nome: "Pq. Industrial", distribuicao: "VALTER / ENEIAS" },
  { id: 5, nome: "Sta Inacia", distribuicao: "VALTER / ENEIAS" },
  { id: 6, nome: "Cidade Vista", distribuicao: "VALTER / ENEIAS" },

  { id: 7, nome: "Palmeira", distribuicao: "MARCELO / VALDOMIRO" },
  { id: 8, nome: "Jd. Antártica", distribuicao: "MARCELO / VALDOMIRO" },
  { id: 9, nome: "Jd. Jaçanã", distribuicao: "MARCELO / VALDOMIRO" },
  { id: 10, nome: "Boa Esperança", distribuicao: "MARCELO / VALDOMIRO" },
  { id: 11, nome: "Santa Cruz", distribuicao: "MARCELO / VALDOMIRO" },
  { id: 12, nome: "Cidade Alta (Esperança)", distribuicao: "MARCELO / VALDOMIRO" },

  { id: 13, nome: "Vila Imperial - Riopret", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 14, nome: "Jd. São Jorge", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 15, nome: "Sto. Antônio", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 16, nome: "Cond. Avelarada", distribuicao: "FABIO / MAURO DOMINGUES" },
  { id: 17, nome: "Jd. Maracanã", distribuicao: "FABIO / MAURO DOMINGUES" },

  { id: 18, nome: "Jd. Castelano", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 19, nome: "Higienópolis", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 20, nome: "Jd. Urano", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 21, nome: "Jd. Nova Esperança", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 22, nome: "Cidade Jardim", distribuicao: "ELIABE / EDUARDO / RAQUEL" },
  { id: 23, nome: "Luz da Esperança", distribuicao: "ELIABE / EDUARDO / RAQUEL" },

  { id: 24, nome: "Maquininha", distribuicao: "JAQUELINE" },
  { id: 25, nome: "Talhado", distribuicao: "JAQUELINE" },
  { id: 26, nome: "Planalto", distribuicao: "JAQUELINE" },
  { id: 27, nome: "São Tomaz (Cond. NS Aparecida)", distribuicao: "JAQUELINE" },
  { id: 28, nome: "Cecap", distribuicao: "JAQUELINE" },
  { id: 29, nome: "Res. Doce Viver", distribuicao: "JAQUELINE" },
  { id: 30, nome: "Sala de Costura", distribuicao: "JAQUELINE" },
  { id: 31, nome: "Mandacaru", distribuicao: "JAQUELINE" },

  { id: 32, nome: "Eng. Schmidt", distribuicao: "DEBORA" },
  { id: 33, nome: "Vila Toninho", distribuicao: "DEBORA" },
  { id: 34, nome: "Cristo Rei", distribuicao: "DEBORA" },
  { id: 35, nome: "América", distribuicao: "DEBORA" },
  { id: 36, nome: "Santa Maria", distribuicao: "DEBORA" },
  { id: 37, nome: "São Carlos", distribuicao: "DEBORA" },
  { id: 38, nome: "Parque Setor", distribuicao: "DEBORA" },
  { id: 39, nome: "Maraca (Prefeitura)", distribuicao: "DEBORA" },
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
  "VALTER / ENEIAS",
  "MARCELO / VALDOMIRO",
  "FABIO / MAURO DOMINGUES",
  "ELIABE / EDUARDO / RAQUEL",
  "JAQUELINE",
  "DEBORA",
];
