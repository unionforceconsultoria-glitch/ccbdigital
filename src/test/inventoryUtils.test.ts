import { describe, it, expect } from "vitest";
import {
  agruparItensParaConferencia,
  classificarResultados,
  calcularResumoInventario,
  normalizarChaveGrupo,
  encontrarItemPorCodigo,
  type InventarioItem,
  type BemExtra,
} from "@/lib/inventoryUtils";

function makeItem(overrides: Partial<InventarioItem> & { id: string; descricao: string }): InventarioItem {
  const categoria = overrides.categoria ?? "Mobiliário";
  return {
    inventario_id: "inv-1",
    codigo_patrimonial: null,
    categoria,
    localizacao: null,
    grupo_chave: normalizarChaveGrupo(overrides.descricao, categoria),
    quantidade_esperada: 1,
    quantidade_encontrada: null,
    status_conferencia: "pendente",
    status_etiqueta: "presente_legivel",
    metodo_conferencia: null,
    observacoes: null,
    conferido_em: null,
    ...overrides,
  };
}

describe("Inventário Patrimonial — regras de agrupamento e classificação", () => {
  it("agrupa 80 bancos de madeira idênticos preservando códigos individuais sem juntar bens diferentes", () => {
    const bancos = Array.from({ length: 80 }, (_, idx) =>
      makeItem({
        id: `b-${idx + 1}`,
        codigo_patrimonial: `PAT-${String(idx + 1).padStart(4, "0")}`,
        descricao: "Banco de madeira",
        categoria: "Mobiliário",
      }),
    );
    const cadeira = makeItem({
      id: "c-1",
      codigo_patrimonial: "PAT-0900",
      descricao: "Banco de madeira infantil",
      categoria: "Mobiliário",
    });

    const grupos = agruparItensParaConferencia([...bancos, cadeira]);
    expect(grupos).toHaveLength(2);

    const grupoBancos = grupos.find((g) => g.descricao === "Banco de madeira")!;
    expect(grupoBancos.quantidade_esperada).toBe(80);
    expect(grupoBancos.itens).toHaveLength(80);
    expect(grupoBancos.itens[0]!.codigo_patrimonial).toBe("PAT-0001");
    expect(grupoBancos.itens[79]!.codigo_patrimonial).toBe("PAT-0080");
  });

  it("classifica bem encontrado sem etiqueta como ENCONTRADO e pendência de etiqueta, nunca como não encontrado", () => {
    const itemSemEtiqueta = makeItem({
      id: "i-1",
      codigo_patrimonial: "PAT-100",
      descricao: "Mesa de som 16 canais",
      categoria: "Som",
      status_conferencia: "encontrado",
      status_etiqueta: "ausente",
      quantidade_encontrada: 1,
    });
    const itemNaoEncontrado = makeItem({
      id: "i-2",
      codigo_patrimonial: "PAT-101",
      descricao: "Microfone sem fio",
      categoria: "Som",
      status_conferencia: "nao_encontrado",
      quantidade_encontrada: 0,
    });
    const itemDanificado = makeItem({
      id: "i-3",
      codigo_patrimonial: "PAT-102",
      descricao: "Ventilador de parede",
      categoria: "Climatização",
      status_conferencia: "encontrado",
      status_etiqueta: "danificada",
      quantidade_encontrada: 1,
    });
    const extra: BemExtra = {
      id: "ex-1",
      inventario_id: "inv-1",
      descricao: "Bebedouro industrial",
      quantidade: 1,
      codigo_patrimonial: null,
      localizacao: "Cozinha",
      observacoes: "Sem plaqueta",
    };

    const cl = classificarResultados([itemSemEtiqueta, itemNaoEncontrado, itemDanificado], [extra]);
    expect(cl.encontrados.map((i) => i.id)).toContain("i-1");
    expect(cl.naoEncontrados.map((i) => i.id)).not.toContain("i-1");
    expect(cl.semEtiqueta.map((i) => i.id)).toEqual(["i-1"]);
    expect(cl.naoEncontrados.map((i) => i.id)).toEqual(["i-2"]);
    expect(cl.etiquetasDanificadasOuIlegiveis.map((i) => i.id)).toEqual(["i-3"]);
    expect(cl.bensExtras).toHaveLength(1);

    const resumo = calcularResumoInventario([itemSemEtiqueta, itemNaoEncontrado, itemDanificado], [extra]);
    expect(resumo.encontrados).toBe(2);
    expect(resumo.nao_encontrados).toBe(1);
    expect(resumo.sem_etiqueta).toBe(1);
    expect(resumo.etiquetas_danificadas).toBe(1);
    expect(resumo.bens_extras).toBe(1);
  });

  it("reconhece o código da etiqueta CCB (ex.: '22-4471 / 000001') com ou sem pontuação/espaços ou pelo sequencial", () => {
    const itens = [
      makeItem({ id: "1", codigo_patrimonial: "22-4471 / 000001", descricao: "56 - EXTINTOR PÓ QUÍMICO SECO 4KG" }),
      makeItem({ id: "2", codigo_patrimonial: "22-4471 / 000002", descricao: "4 - CADEIRA MADEIRA ASSENTO ESTOFADO" }),
    ];

    expect(encontrarItemPorCodigo(itens, "22-4471 / 000001")?.id).toBe("1");
    expect(encontrarItemPorCodigo(itens, "22-4471/000001")?.id).toBe("1");
    expect(encontrarItemPorCodigo(itens, "224471000001")?.id).toBe("1");
    expect(encontrarItemPorCodigo(itens, "000002")?.id).toBe("2");
    expect(encontrarItemPorCodigo(itens, "2")?.id).toBe("2");
    expect(encontrarItemPorCodigo(itens, "999999")).toBeUndefined();
  });
});