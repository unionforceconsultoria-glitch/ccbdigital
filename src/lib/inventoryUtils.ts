export type TipoProcedimento = "semestral" | "anual";
export type StatusInventario = "em_andamento" | "concluido";
export type StatusConferencia = "pendente" | "encontrado" | "nao_encontrado" | "divergencia";
export type StatusEtiqueta =
  | "presente_legivel"
  | "ausente"
  | "danificada"
  | "ilegivel"
  | "necessita_substituicao";
export type MetodoConferencia = "quantidade" | "etiqueta" | "manual";

export interface ExtractedInventoryItem {
  codigo_patrimonial: string | null;
  descricao: string;
  categoria: string;
  localizacao: string | null;
  quantidade: number;
}

export interface InventarioItem {
  id: string;
  inventario_id: string;
  codigo_patrimonial: string | null;
  descricao: string;
  categoria: string;
  localizacao: string | null;
  grupo_chave: string;
  quantidade_esperada: number;
  quantidade_encontrada: number | null;
  status_conferencia: StatusConferencia;
  status_etiqueta: StatusEtiqueta;
  metodo_conferencia: MetodoConferencia | null;
  observacoes: string | null;
  conferido_em: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BemExtra {
  id: string;
  inventario_id: string;
  descricao: string;
  quantidade: number;
  codigo_patrimonial: string | null;
  localizacao: string | null;
  observacoes: string | null;
  created_at?: string;
}

export interface ResumoInventario {
  total_itens: number;
  conferidos: number;
  pendentes: number;
  encontrados: number;
  nao_encontrados: number;
  divergencias: number;
  sem_etiqueta: number;
  etiquetas_danificadas: number;
  bens_extras: number;
}

export interface InventarioRecord {
  id: string;
  igreja_id: number;
  igreja_nome: string;
  responsavel: string;
  tipo_procedimento: TipoProcedimento;
  data_inventario: string;
  status: StatusInventario;
  pdf_original_url: string | null;
  pdf_original_nome: string | null;
  relatorio_final_url: string | null;
  arquivado_documentos: boolean;
  envio_documento_id: string | null;
  dados_extraidos_json: ExtractedInventoryItem[];
  resumo_json: Partial<ResumoInventario>;
  created_at: string;
  updated_at: string;
}

export interface GrupoInventario {
  grupo_chave: string;
  descricao: string;
  categoria: string;
  dependencias: string | null;
  itens: InventarioItem[];
  quantidade_esperada: number;
  quantidade_encontrada: number;
  conferidos_count: number;
  todos_conferidos: boolean;
  diferenca: number;
}

export interface ClassificacaoResultados {
  encontrados: InventarioItem[];
  naoEncontrados: InventarioItem[];
  divergencias: GrupoInventario[];
  semEtiqueta: InventarioItem[];
  etiquetasDanificadasOuIlegiveis: InventarioItem[];
  bensExtras: BemExtra[];
}

export const ETIQUETA_LABELS: Record<StatusEtiqueta, string> = {
  presente_legivel: "Presente e legível",
  ausente: "Ausente (sem etiqueta)",
  danificada: "Danificada",
  ilegivel: "Ilegível",
  necessita_substituicao: "Necessita substituição",
};

export const STATUS_CONFERENCIA_LABELS: Record<StatusConferencia, string> = {
  pendente: "Pendente",
  encontrado: "Encontrado",
  nao_encontrado: "Não encontrado",
  divergencia: "Divergência",
};

function stripAccentsLower(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface BancoMetragemInfo {
  chave: string;
  titulo: string | null;
}

/**
 * Identifica bancos / genuflexórios e extrai a metragem (ex.: 2,34 m, 1,50 m).
 * Bancos e genuflexórios com a mesma metragem são agrupados juntos, independentemente
 * de variações na descrição ou da dependência/OBS; metragens diferentes ficam separadas.
 */
function analisarBancoOuGenuflexorio(descricao: string): BancoMetragemInfo | null {
  const norm = stripAccentsLower(descricao);
  if (!/\b(bancos?|genuflexorios?)\b/.test(norm)) return null;

  const metragemMatch = norm.match(/(\d+(?:[.,]\d{1,3})?)\s*m(?:ts?|etros?)?\b/);
  if (metragemMatch) {
    const rawNum = metragemMatch[1]!.replace(",", ".");
    const parsed = Number.parseFloat(rawNum);
    if (!Number.isNaN(parsed) && parsed > 0) {
      const decimalsPart = rawNum.split(".")[1] || "";
      const useThreeDecimals = decimalsPart.length === 3 && !decimalsPart.endsWith("0");
      const canonical = useThreeDecimals ? parsed.toFixed(3) : parsed.toFixed(2);
      const display = canonical.replace(".", ",");
      return {
        chave: `banco_genuflexorio::${canonical}m`,
        titulo: `Banco de madeira / Genuflexório — ${display} m`,
      };
    }
  }

  if (/\binfantil\b/.test(norm)) {
    return { chave: "banco_genuflexorio::infantil", titulo: null };
  }

  return { chave: "banco_genuflexorio::sem_metragem", titulo: null };
}

/**
 * Extrai a dependência efetiva do item, priorizando observações de ambiente (ex.: "OBS: SALINHA DE ORAÇÃO")
 * quando presentes na descrição e usando a coluna localização/dependência como padrão.
 */
export function extrairDependenciaItem(descricao: string, localizacao?: string | null): string | null {
  const obsMatch = descricao.match(/\bOBS\s*:\s*([^.;\n]+)/i);
  if (obsMatch?.[1]?.trim()) {
    return obsMatch[1].trim();
  }
  const loc = localizacao?.trim();
  return loc ? loc : null;
}

/**
 * Resume as dependências de um grupo (ex.: "SALAO DE CULTO (6) · SALINHA DE ORAÇÃO (9)").
 */
export function formatarDependenciasGrupo(
  itens: Array<{ descricao: string; localizacao?: string | null; quantidade?: number; quantidade_esperada?: number }>,
): string | null {
  const counts = new Map<string, { label: string; total: number }>();
  for (const item of itens) {
    const dep = extrairDependenciaItem(item.descricao, item.localizacao);
    if (!dep) continue;
    const key = stripAccentsLower(dep).replace(/[^a-z0-9]+/g, " ").trim();
    if (!key) continue;
    const qty = Math.max(1, Number(item.quantidade_esperada ?? item.quantidade ?? 1) || 1);
    const existing = counts.get(key);
    if (existing) {
      existing.total += qty;
    } else {
      counts.set(key, { label: dep, total: qty });
    }
  }
  if (counts.size === 0) return null;
  const entries = Array.from(counts.values()).sort((a, b) => b.total - a.total);
  if (entries.length === 1) return entries[0]!.label;
  return entries.map((e) => `${e.label} (${e.total})`).join(" · ");
}

/**
 * Retorna o título de exibição do grupo (padronizado para bancos/genuflexórios com metragem).
 */
export function obterDescricaoGrupo(descricao: string): string {
  const bancoInfo = analisarBancoOuGenuflexorio(descricao);
  if (bancoInfo?.titulo) return bancoInfo.titulo;
  return descricao.trim();
}

/**
 * Normaliza descrição + categoria para agrupar bens idênticos (ex.: 80 bancos de madeira)
 * sem misturar bens com descrições ou categorias diferentes.
 * Para bancos e genuflexórios, agrupa por metragem independente de dependência/OBS.
 */
export function normalizarChaveGrupo(descricao: string, categoria = "Geral"): string {
  const bancoInfo = analisarBancoOuGenuflexorio(descricao);
  if (bancoInfo) return bancoInfo.chave;

  const clean = (s: string) =>
    stripAccentsLower(s)
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${clean(categoria || "geral")}::${clean(descricao)}`;
}


/**
 * Agrupa itens idênticos preservando todos os códigos patrimoniais individuais.
 */
export function agruparItensParaConferencia(itens: InventarioItem[]): GrupoInventario[] {
  const map = new Map<string, InventarioItem[]>();
  for (const item of itens) {
    const key = normalizarChaveGrupo(item.descricao, item.categoria);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }

  const grupos: GrupoInventario[] = [];
  for (const [grupo_chave, list] of map.entries()) {
    const first = list[0]!;
    const quantidade_esperada = list.reduce((sum, i) => sum + (i.quantidade_esperada || 1), 0);
    const conferidos = list.filter((i) => i.status_conferencia !== "pendente");
    const quantidade_encontrada = list.reduce((sum, i) => {
      if (i.quantidade_encontrada !== null && i.quantidade_encontrada !== undefined) {
        return sum + i.quantidade_encontrada;
      }
      if (i.status_conferencia === "encontrado") return sum + (i.quantidade_esperada || 1);
      return sum;
    }, 0);

    grupos.push({
      grupo_chave,
      descricao: obterDescricaoGrupo(first.descricao),
      categoria: first.categoria || "Geral",
      dependencias: formatarDependenciasGrupo(list),
      itens: list,
      quantidade_esperada,
      quantidade_encontrada,
      conferidos_count: conferidos.length,
      todos_conferidos: conferidos.length === list.length && list.length > 0,
      diferenca: quantidade_encontrada - quantidade_esperada,
    });
  }

  return grupos.sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
}

/**
 * Classifica os resultados nas 6 categorias obrigatórias.
 * REGRA CRÍTICA: Bem encontrado fisicamente sem etiqueta é ENCONTRADO + pendência de etiqueta,
 * NUNCA classificado como não encontrado.
 */
export function classificarResultados(
  itens: InventarioItem[],
  bensExtras: BemExtra[],
): ClassificacaoResultados {
  const encontrados = itens.filter(
    (i) =>
      i.status_conferencia === "encontrado" ||
      (i.status_conferencia === "divergencia" && (i.quantidade_encontrada ?? 0) > 0),
  );

  const naoEncontrados = itens.filter((i) => i.status_conferencia === "nao_encontrado");

  const grupos = agruparItensParaConferencia(itens);
  const divergencias = grupos.filter(
    (g) => g.conferidos_count > 0 && g.diferenca !== 0,
  );

  const semEtiqueta = encontrados.filter((i) => i.status_etiqueta === "ausente");

  const etiquetasDanificadasOuIlegiveis = encontrados.filter((i) =>
    ["danificada", "ilegivel", "necessita_substituicao"].includes(i.status_etiqueta),
  );

  return {
    encontrados,
    naoEncontrados,
    divergencias,
    semEtiqueta,
    etiquetasDanificadasOuIlegiveis,
    bensExtras,
  };
}

export function calcularResumoInventario(
  itens: InventarioItem[],
  bensExtras: BemExtra[],
): ResumoInventario {
  const c = classificarResultados(itens, bensExtras);
  const conferidos = itens.filter((i) => i.status_conferencia !== "pendente").length;
  const totalExtras = bensExtras.reduce((sum, b) => sum + (b.quantidade || 1), 0);

  return {
    total_itens: itens.length,
    conferidos,
    pendentes: itens.length - conferidos,
    encontrados: c.encontrados.length,
    nao_encontrados: c.naoEncontrados.length,
    divergencias: c.divergencias.length,
    sem_etiqueta: c.semEtiqueta.length,
    etiquetas_danificadas: c.etiquetasDanificadasOuIlegiveis.length,
    bens_extras: totalExtras,
  };
}

export function formatarDataBR(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function limparCodigo(codigo: string): string {
  return codigo.trim().replace(/\s+/g, "").toLowerCase();
}

export function somenteAlfanumerico(codigo: string): string {
  return codigo.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export interface ParsedCodigoPatrimonial {
  codigoIgreja: string | null;
  codigoItem: string;
}

/**
 * Interpreta o código patrimonial oficial da CCB.
 * Exemplos:
 * - "22-4471 / 000001" -> { codigoIgreja: "22-4471", codigoItem: "000001" }
 * - "22/4471 / 001" ou "22/4471/001" -> { codigoIgreja: "22-4471", codigoItem: "001" }
 * - "000001" ou "1" -> { codigoIgreja: null, codigoItem: "000001" / "1" }
 */
export function parseCodigoPatrimonial(rawCode: string): ParsedCodigoPatrimonial | null {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  // Formato completo com código da igreja (XX-YYYY ou XX/YYYY) + "/" + código do item
  const fullMatch = trimmed.match(/^(\d{1,4})\s*[-/]\s*(\d{2,6})\s*\/\s*([a-zA-Z0-9]+)$/);
  if (fullMatch) {
    const [, regiao, igreja, item] = fullMatch;
    return {
      codigoIgreja: `${regiao}-${igreja}`,
      codigoItem: item!,
    };
  }

  // Formato genérico com uma barra separando prefixo e item (ex.: "4471 / 000001")
  const slashParts = trimmed.split("/").map((p) => p.trim()).filter(Boolean);
  if (slashParts.length === 2) {
    return {
      codigoIgreja: slashParts[0]!.replace(/\s+/g, ""),
      codigoItem: slashParts[1]!.replace(/\s+/g, ""),
    };
  }

  // Apenas o código do item (sem código da igreja)
  const itemOnly = somenteAlfanumerico(trimmed);
  if (!itemOnly) return null;
  return { codigoIgreja: null, codigoItem: itemOnly };
}

function normalizarNumeroItem(itemCode: string): string {
  const clean = somenteAlfanumerico(itemCode);
  return clean.replace(/^0+/, "") || clean;
}

/**
 * Localiza um item pelo código da etiqueta patrimonial.
 * Aceita o formato oficial CCB ("22-4471 / 000001" ou "22/4471 / 001"), versões sem espaços/pontuação
 * ("224471000001", "22-4471/000001") e, quando inequívoco e sem prefixo de igreja, apenas o código do item ("000001" ou "1").
 * Nunca confunde um código de outra igreja (ex.: "22-4472 / 000001") com um item desta igreja ("22-4471 / 000001").
 */
export function encontrarItemPorCodigo(
  itens: InventarioItem[],
  rawCode: string,
): InventarioItem | undefined {
  const norm = limparCodigo(rawCode);
  const alnum = somenteAlfanumerico(rawCode);
  if (!norm && !alnum) return undefined;

  const exact = itens.find((i) => i.codigo_patrimonial && limparCodigo(i.codigo_patrimonial) === norm);
  if (exact) return exact;

  const byAlnum = itens.find(
    (i) => i.codigo_patrimonial && somenteAlfanumerico(i.codigo_patrimonial) === alnum,
  );
  if (byAlnum) return byAlnum;

  const parsedInput = parseCodigoPatrimonial(rawCode);
  if (!parsedInput) return undefined;
  const targetItem = normalizarNumeroItem(parsedInput.codigoItem);

  // Se o código informado inclui código da igreja, exige o mesmo código da igreja
  if (parsedInput.codigoIgreja) {
    const targetIgreja = somenteAlfanumerico(parsedInput.codigoIgreja);
    return itens.find((i) => {
      if (!i.codigo_patrimonial) return false;
      const parsedStored = parseCodigoPatrimonial(i.codigo_patrimonial);
      if (!parsedStored?.codigoIgreja) return false;
      return (
        somenteAlfanumerico(parsedStored.codigoIgreja) === targetIgreja &&
        normalizarNumeroItem(parsedStored.codigoItem) === targetItem
      );
    });
  }

  // Sem código de igreja: casa apenas pelo código do item após "/" se for único
  const suffixMatches = itens.filter((i) => {
    if (!i.codigo_patrimonial) return false;
    const parsedStored = parseCodigoPatrimonial(i.codigo_patrimonial);
    if (!parsedStored) return false;
    return (
      somenteAlfanumerico(parsedStored.codigoItem) === alnum ||
      normalizarNumeroItem(parsedStored.codigoItem) === targetItem
    );
  });
  return suffixMatches.length === 1 ? suffixMatches[0] : undefined;
}