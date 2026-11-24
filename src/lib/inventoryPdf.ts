import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type InventarioRecord,
  type InventarioItem,
  type BemExtra,
  ETIQUETA_LABELS,
  STATUS_CONFERENCIA_LABELS,
  classificarResultados,
  calcularResumoInventario,
  formatarDataBR,
} from "@/lib/inventoryUtils";

function addHeader(doc: jsPDF, titulo: string, subtitulo: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(45, 50, 58);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Patrimônio CCB Digital — Inventário Patrimonial", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(titulo, 14, 20);

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(subtitulo, 14, 37);
}

function addFooters(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, h - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, h - 8, { align: "right" });
  }
}

function lastY(doc: jsPDF, fallback: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

/** 1. Relatório individual por igreja */
export function gerarRelatorioIndividualPdf(
  inventario: InventarioRecord,
  itens: InventarioItem[],
  bensExtras: BemExtra[],
): { blob: Blob; filename: string; download: () => void } {
  const doc = new jsPDF();
  const resumo = calcularResumoInventario(itens, bensExtras);
  const cl = classificarResultados(itens, bensExtras);
  const tipoLabel = inventario.tipo_procedimento === "anual" ? "Anual" : "Semestral";

  addHeader(
    doc,
    `Relatório Individual — ${inventario.igreja_nome}`,
    `Data: ${formatarDataBR(inventario.data_inventario)} | Procedimento: ${tipoLabel} | Responsável: ${inventario.responsavel}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Total", "Encontrados", "Não Encontrados", "Divergências", "Sem Etiqueta", "Etiq. Danificadas", "Extras"]],
    body: [[
      resumo.total_itens,
      resumo.encontrados,
      resumo.nao_encontrados,
      resumo.divergencias,
      resumo.sem_etiqueta,
      resumo.etiquetas_danificadas,
      resumo.bens_extras,
    ]],
    theme: "grid",
    headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 8 },
    styles: { fontSize: 9, halign: "center" },
  });

  const addSection = (title: string, head: string[][], body: (string | number)[][], color: [number, number, number]) => {
    if (body.length === 0) return;
    const y = lastY(doc, 60) + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(35, 35, 35);
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: color, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
    });
  };

  addSection(
    "1. Bens Não Encontrados",
    [["Código", "Descrição", "Categoria", "Qtd", "Situação"]],
    cl.naoEncontrados.map((i) => [
      i.codigo_patrimonial || "—",
      i.descricao,
      i.categoria,
      i.quantidade_esperada,
      STATUS_CONFERENCIA_LABELS[i.status_conferencia],
    ]),
    [185, 28, 28],
  );

  addSection(
    "2. Divergências de Quantidade",
    [["Descrição", "Categoria", "Esperado", "Encontrado", "Diferença"]],
    cl.divergencias.map((g) => [
      g.descricao,
      g.categoria,
      g.quantidade_esperada,
      g.quantidade_encontrada,
      g.diferenca > 0 ? `+${g.diferenca}` : String(g.diferenca),
    ]),
    [180, 83, 9],
  );

  addSection(
    "3. Bens Encontrados Sem Etiqueta (Pendência de Regularização)",
    [["Código", "Descrição", "Categoria", "Situação"]],
    cl.semEtiqueta.map((i) => [
      i.codigo_patrimonial || "Sem etiqueta",
      i.descricao,
      i.categoria,
      "Encontrado — Sem etiqueta",
    ]),
    [161, 98, 7],
  );

  addSection(
    "4. Etiquetas Danificadas, Ilegíveis ou para Substituição",
    [["Código", "Descrição", "Etiqueta", "Observações"]],
    cl.etiquetasDanificadasOuIlegiveis.map((i) => [
      i.codigo_patrimonial || "—",
      i.descricao,
      ETIQUETA_LABELS[i.status_etiqueta],
      i.observacoes || "—",
    ]),
    [107, 114, 128],
  );

  addSection(
    "5. Bens Extras / Não Cadastrados",
    [["Código", "Descrição", "Qtd", "Localização", "Observações"]],
    cl.bensExtras.map((b) => [
      b.codigo_patrimonial || "Não cadastrado",
      b.descricao,
      b.quantidade,
      b.localizacao || "—",
      b.observacoes || "—",
    ]),
    [30, 64, 175],
  );

  addSection(
    "6. Relação de Bens Encontrados",
    [["Código", "Descrição", "Categoria", "Qtd", "Etiqueta"]],
    cl.encontrados.map((i) => [
      i.codigo_patrimonial || "—",
      i.descricao,
      i.categoria,
      i.quantidade_encontrada ?? i.quantidade_esperada,
      ETIQUETA_LABELS[i.status_etiqueta],
    ]),
    [22, 101, 52],
  );

  addFooters(doc);
  const slug = inventario.igreja_nome.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const filename = `inventario-${slug}-${inventario.data_inventario}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename, download: () => doc.save(filename) };
}

/** 2. Relatório geral de todas as igrejas */
export function gerarRelatorioGeralPdf(
  inventarios: InventarioRecord[],
  allItens: InventarioItem[],
  allExtras: BemExtra[],
) {
  const doc = new jsPDF();
  addHeader(
    doc,
    "Relatório Geral de Inventários Patrimoniais",
    `Total de inventários registrados: ${inventarios.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  const rows = inventarios.map((inv) => {
    const itens = allItens.filter((i) => i.inventario_id === inv.id);
    const extras = allExtras.filter((e) => e.inventario_id === inv.id);
    const r = calcularResumoInventario(itens, extras);
    return [
      formatarDataBR(inv.data_inventario),
      inv.igreja_nome,
      inv.tipo_procedimento === "anual" ? "Anual" : "Semestral",
      r.encontrados,
      r.nao_encontrados,
      r.sem_etiqueta,
      r.divergencias,
      r.bens_extras,
      inv.status === "concluido" ? "Concluído" : "Em andamento",
    ];
  });

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Tipo", "Encontr.", "Faltantes", "Sem Etiq.", "Diverg.", "Extras", "Situação"]],
    body: rows.length ? rows : [["—", "Nenhum inventário registrado", "—", 0, 0, 0, 0, 0, "—"]],
    theme: "grid",
    headStyles: { fillColor: [45, 50, 58], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [247, 247, 247] },
  });

  addFooters(doc);
  doc.save(`relatorio-geral-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** 3. Relatório de bens não encontrados */
export function gerarRelatorioNaoEncontradosPdf(inventarios: InventarioRecord[], allItens: InventarioItem[]) {
  const doc = new jsPDF();
  const invMap = new Map(inventarios.map((i) => [i.id, i]));
  const list = allItens.filter((i) => i.status_conferencia === "nao_encontrado" && invMap.has(i.inventario_id));

  addHeader(
    doc,
    "Relatório de Bens Não Encontrados",
    `Total de registros: ${list.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Código", "Descrição", "Qtd", "Situação"]],
    body: list.length
      ? list.map((i) => {
          const inv = invMap.get(i.inventario_id)!;
          return [
            formatarDataBR(inv.data_inventario),
            inv.igreja_nome,
            i.codigo_patrimonial || "—",
            i.descricao,
            i.quantidade_esperada,
            "Não encontrado",
          ];
        })
      : [["—", "Nenhum bem não encontrado", "—", "—", 0, "—"]],
    theme: "grid",
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  addFooters(doc);
  doc.save(`relatorio-bens-nao-encontrados-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** 4. Relatório de etiquetas faltantes */
export function gerarRelatorioEtiquetasFaltantesPdf(inventarios: InventarioRecord[], allItens: InventarioItem[]) {
  const doc = new jsPDF();
  const invMap = new Map(inventarios.map((i) => [i.id, i]));
  const list = allItens.filter(
    (i) =>
      invMap.has(i.inventario_id) &&
      i.status_etiqueta === "ausente" &&
      i.status_conferencia !== "nao_encontrado",
  );

  addHeader(
    doc,
    "Relatório de Etiquetas Faltantes (Regularização)",
    `Total de bens encontrados sem etiqueta: ${list.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Código", "Descrição", "Qtd", "Situação"]],
    body: list.length
      ? list.map((i) => {
          const inv = invMap.get(i.inventario_id)!;
          return [
            formatarDataBR(inv.data_inventario),
            inv.igreja_nome,
            i.codigo_patrimonial || "Sem etiqueta",
            i.descricao,
            i.quantidade_encontrada ?? i.quantidade_esperada,
            "Encontrado — Sem etiqueta",
          ];
        })
      : [["—", "Nenhuma pendência de etiqueta ausente", "—", "—", 0, "—"]],
    theme: "grid",
    headStyles: { fillColor: [161, 98, 7], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  addFooters(doc);
  doc.save(`relatorio-etiquetas-faltantes-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** 5. Relatório de etiquetas danificadas ou ilegíveis */
export function gerarRelatorioEtiquetasDanificadasPdf(inventarios: InventarioRecord[], allItens: InventarioItem[]) {
  const doc = new jsPDF();
  const invMap = new Map(inventarios.map((i) => [i.id, i]));
  const list = allItens.filter(
    (i) =>
      invMap.has(i.inventario_id) &&
      ["danificada", "ilegivel", "necessita_substituicao"].includes(i.status_etiqueta),
  );

  addHeader(
    doc,
    "Relatório de Etiquetas Danificadas / Ilegíveis",
    `Total de registros: ${list.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Código", "Descrição", "Qtd", "Situação da Etiqueta"]],
    body: list.length
      ? list.map((i) => {
          const inv = invMap.get(i.inventario_id)!;
          return [
            formatarDataBR(inv.data_inventario),
            inv.igreja_nome,
            i.codigo_patrimonial || "—",
            i.descricao,
            i.quantidade_encontrada ?? i.quantidade_esperada,
            ETIQUETA_LABELS[i.status_etiqueta],
          ];
        })
      : [["—", "Nenhuma etiqueta danificada ou ilegível", "—", "—", 0, "—"]],
    theme: "grid",
    headStyles: { fillColor: [107, 114, 128], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  addFooters(doc);
  doc.save(`relatorio-etiquetas-danificadas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** 6. Relatório de divergências de quantidade */
export function gerarRelatorioDivergenciasPdf(inventarios: InventarioRecord[], allItens: InventarioItem[]) {
  const doc = new jsPDF();
  const rows: (string | number)[][] = [];

  for (const inv of inventarios) {
    const itens = allItens.filter((i) => i.inventario_id === inv.id);
    const { divergencias } = classificarResultados(itens, []);
    for (const g of divergencias) {
      rows.push([
        formatarDataBR(inv.data_inventario),
        inv.igreja_nome,
        g.descricao,
        g.quantidade_esperada,
        g.quantidade_encontrada,
        g.diferenca > 0 ? `+${g.diferenca}` : String(g.diferenca),
      ]);
    }
  }

  addHeader(
    doc,
    "Relatório de Divergências de Quantidade",
    `Total de grupos com divergência: ${rows.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Descrição", "Esperado", "Encontrado", "Diferença"]],
    body: rows.length ? rows : [["—", "Nenhuma divergência de quantidade", "—", 0, 0, "0"]],
    theme: "grid",
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  addFooters(doc);
  doc.save(`relatorio-divergencias-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** 7. Relatório de bens extras não cadastrados */
export function gerarRelatorioBensExtrasPdf(inventarios: InventarioRecord[], allExtras: BemExtra[]) {
  const doc = new jsPDF();
  const invMap = new Map(inventarios.map((i) => [i.id, i]));
  const list = allExtras.filter((b) => invMap.has(b.inventario_id));

  addHeader(
    doc,
    "Relatório de Bens Extras / Não Cadastrados",
    `Total de registros: ${list.length} | Data: ${new Date().toLocaleDateString("pt-BR")}`,
  );

  autoTable(doc, {
    startY: 43,
    head: [["Data", "Igreja", "Código", "Descrição", "Qtd", "Localização / Obs."]],
    body: list.length
      ? list.map((b) => {
          const inv = invMap.get(b.inventario_id)!;
          return [
            formatarDataBR(inv.data_inventario),
            inv.igreja_nome,
            b.codigo_patrimonial || "Não cadastrado",
            b.descricao,
            b.quantidade,
            [b.localizacao, b.observacoes].filter(Boolean).join(" — ") || "—",
          ];
        })
      : [["—", "Nenhum bem extra registrado", "—", "—", 0, "—"]],
    theme: "grid",
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  addFooters(doc);
  doc.save(`relatorio-bens-extras-${new Date().toISOString().slice(0, 10)}.pdf`);
}