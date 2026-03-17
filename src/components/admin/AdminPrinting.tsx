import React, { useState } from "react";
import { igrejas, tiposFormulario } from "@/data/churches";
import { listarEnvios } from "@/lib/storage";
import { Download, Printer, FileText, Search } from "lucide-react";

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

const AdminPrinting: React.FC = () => {
  const year = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const [mesFiltro, setMesFiltro] = useState(currentMonth);
  const [igrejaFiltro, setIgrejaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const envios = listarEnvios();
  const mesRef = `${year}-${mesFiltro}`;

  const filtered = envios.filter((e) => {
    if (e.mes_referencia !== mesRef) return false;
    if (igrejaFiltro && e.igreja_id !== Number(igrejaFiltro)) return false;
    if (tipoFiltro && e.tipo_formulario !== tipoFiltro) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-background rounded-2xl card-shadow p-4 space-y-3">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <Search className="w-5 h-5" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            {meses.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={igrejaFiltro}
            onChange={(e) => setIgrejaFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todas as igrejas</option>
            {igrejas.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todos os formulários</option>
            {tiposFormulario.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-primary">
            {filtered.length} documento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </h3>
          {filtered.length > 0 && (
            <button
              onClick={() => window.print()}
              className="text-sm font-semibold text-primary flex items-center gap-1"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum documento encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((envio) => (
              <div
                key={envio.id}
                className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold truncate">{envio.igreja_nome}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {envio.tipo_formulario} · {envio.protocolo}
                  </p>
                </div>
                <a
                  href={envio.arquivo_url}
                  download={envio.arquivo_nome}
                  className="text-primary hover:text-primary/80 shrink-0 ml-2"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPrinting;
