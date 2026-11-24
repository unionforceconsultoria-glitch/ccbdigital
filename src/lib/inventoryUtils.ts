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

/**
 * Normaliza descrição + categoria para agrupar bens idênticos (ex.: 80 bancos de madeira)
 * sem misturar bens com descrições ou categorias diferentes.
 */
export function normalizarChaveGrupo(descricao: string, categoria = "Geral"): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
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
    const key = item.grupo_chave || normalizarChaveGrupo(item.descricao, item.categoria);
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
      descricao: first.descricao,
      categoria: first.categoria || "Geral",
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