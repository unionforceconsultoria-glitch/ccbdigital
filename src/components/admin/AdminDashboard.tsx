import React, { useState } from "react";
import { useEnvios, getMesReferencia, useIgrejas } from "@/lib/storage";
import { Church, ChevronDown } from "lucide-react";

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
  const mesAtualDefault = getMesReferencia();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDefault);

  const [anoStr, mesStr] = mesSelecionado.split("-");
  const mesLabel = meses.find((m) => m.value === mesStr)?.label || mesStr;

  const igrejasQueEnviaram = new Set(
    envios.filter((e) => e.mes_referencia === mesSelecionado).map((e) => e.igreja_id)
  );

  const totalIgrejas = igrejas.length;
  const enviados = igrejasQueEnviaram.size;
  const pendentes = totalIgrejas - enviados;

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
