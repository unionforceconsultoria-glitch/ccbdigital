import React, { useState } from "react";
import { useEnvios, getMesAnterior, useIgrejas } from "@/lib/storage";
import { Church, ChevronDown, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const getYears = () => {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
};

const AdminDashboard: React.FC = () => {
  const { data: envios = [] } = useEnvios();
  const { data: igrejas = [] } = useIgrejas();
  const mesAtualDefault = getMesAnterior();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDefault);

  const [anoStr, mesStr] = mesSelecionado.split("-");
  const mesLabel = meses.find((m) => m.value === mesStr)?.label || mesStr;

  const igrejasQueEnviaram = new Set(
    envios.filter((e) => e.mes_referencia === mesSelecionado).map((e) => e.igreja_id)
  );

  const totalIgrejas = igrejas.length;
  const enviados = igrejasQueEnviaram.size;
  const pendentes = totalIgrejas - enviados;

  const gerarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header band
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Patrimônio CCB Digital", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Envio de Formulários", 14, 20);

    // Subtitle
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Mês de Referência: ${mesLabel} / ${anoStr}`, 14, 40);

    // Summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Total de igrejas: ${totalIgrejas}`, 14, 48);
    doc.text(`Enviados: ${enviados}`, 70, 48);
    doc.text(`Pendentes: ${pendentes}`, 120, 48);

    const enviadasList = igrejas.filter((i) => igrejasQueEnviaram.has(i.id));
    const pendentesList = igrejas.filter((i) => !igrejasQueEnviaram.has(i.id));

    autoTable(doc, {
      startY: 56,
      head: [["#", "Igreja (Enviou)"]],
      body: enviadasList.map((i, idx) => [idx + 1, i.nome]),
      theme: "grid",
      headStyles: { fillColor: [34, 139, 87], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    autoTable(doc, {
      startY: lastY + 8,
      head: [["#", "Igreja (Pendente)"]],
      body: pendentesList.map((i, idx) => [idx + 1, i.nome]),
      theme: "grid",
      headStyles: { fillColor: [180, 40, 40], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")}`,
        14,
        h - 8
      );
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, h - 8, { align: "right" });
    }

    doc.save(`relatorio-envios-${mesSelecionado}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Mês de Referência</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={mesStr}
              onChange={(e) => setMesSelecionado(`${anoStr}-${e.target.value}`)}
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative w-28">
            <select
              value={anoStr}
              onChange={(e) => setMesSelecionado(`${e.target.value}-${mesStr}`)}
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
            >
              {getYears().map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* PDF Report Button */}
      <button
        onClick={gerarPDF}
        className="w-full touch-target bg-primary text-primary-foreground rounded-2xl card-shadow font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors py-3"
      >
        <FileDown className="w-5 h-5" />
        Gerar Relatório em PDF
      </button>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background rounded-2xl card-shadow p-4 text-center">
          <p className="text-3xl font-bold text-primary tabular-nums">{totalIgrejas}</p>
          <p className="text-xs font-semibold text-muted-foreground mt-1">Total</p>
        </div>
        <div className="bg-background rounded-2xl card-shadow p-4 text-center">
          <p className="text-3xl font-bold text-success tabular-nums">{enviados}</p>
          <p className="text-xs font-semibold text-muted-foreground mt-1">Enviados</p>
        </div>
        <div className="bg-background rounded-2xl card-shadow p-4 text-center">
          <p className="text-3xl font-bold text-destructive tabular-nums">{pendentes}</p>
          <p className="text-xs font-semibold text-muted-foreground mt-1">Pendentes</p>
        </div>
      </div>

      {/* Church list */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
          <Church className="w-5 h-5" />
          Status das Igrejas — {mesLabel} / {anoStr}
        </h3>
        <div className="space-y-1">
          {igrejas.map((igreja) => {
            const enviou = igrejasQueEnviaram.has(igreja.id);
            return (
              <div
                key={igreja.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {enviou ? (
                    <span className="w-3 h-3 rounded-full bg-success animate-pulse-dot shrink-0" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-destructive shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{igreja.nome}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {igreja.distribuicao}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
