import React, { useState } from "react";
import { igrejas, distribuicoes } from "@/data/churches";
import { listarEnvios, getMesReferencia } from "@/lib/storage";
import { BarChart3, ChevronDown } from "lucide-react";

const AdminDistribution: React.FC = () => {
  const [filtro, setFiltro] = useState("");
  const envios = listarEnvios();
  const mesAtual = getMesReferencia();

  const igrejasQueEnviaram = new Set(
    envios.filter((e) => e.mes_referencia === mesAtual).map((e) => e.igreja_id)
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
          Dashboard por Distribuição
        </h3>
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
            {/* Progress bar */}
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
