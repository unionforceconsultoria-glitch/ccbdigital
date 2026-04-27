import React, { useState } from "react";
import { distribuicoes } from "@/data/churches";
import { useEnvios, getMesReferencia, useIgrejas } from "@/lib/storage";
import { BarChart3, ChevronDown } from "lucide-react";

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

const AdminDistribution: React.FC = () => {
  const [filtro, setFiltro] = useState("");
  const { data: envios = [] } = useEnvios();
  const { data: igrejas = [] } = useIgrejas();
  const mesAtualDefault = getMesReferencia();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDefault);

  const [anoStr, mesStr] = mesSelecionado.split("-");
  const mesLabel = meses.find((m) => m.value === mesStr)?.label || mesStr;

  const igrejasQueEnviaram = new Set(
    envios.filter((e) => e.mes_referencia === mesSelecionado).map((e) => e.igreja_id)
  );

  const distData = distribuicoes
    .filter((d) => !filtro || d === filtro)
    .map((dist) => {
      const igsDist = igrejas.filter((i) => i.distribuicao === dist);
      const enviaram = igsDist.filter((i) => igrejasQueEnviaram.has(i.id)).length;
      return { nome: dist, total: igsDist.length, enviaram };
    });

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-2xl card-shadow p-4">
        <h3 className="font-bold text-primary flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5" />
          Dashboard por Distribuição — {mesLabel} / {anoStr}
        </h3>

        {/* Month selector */}
        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Mês de Referência</label>
        <div className="flex gap-2 mb-3">
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

        {/* Distribution filter */}
        <div className="relative">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todas as distribuições</option>
            {distribuicoes.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {distData.map((dist) => {
        const pct = dist.total > 0 ? Math.round((dist.enviaram / dist.total) * 100) : 0;
        return (
          <div key={dist.nome} className="bg-background rounded-2xl card-shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">{dist.nome}</h4>
              <span className="text-xs font-bold text-primary tabular-nums">
                {dist.enviaram}/{dist.total}
              </span>
            </div>
            <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct === 100 ? "hsl(var(--success))" : pct > 0 ? "hsl(var(--accent))" : "hsl(var(--destructive))",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">{pct}% concluído</p>
          </div>
        );
      })}
    </div>
  );
};

export default AdminDistribution;
