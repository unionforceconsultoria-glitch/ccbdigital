import React from "react";
import { igrejas } from "@/data/churches";
import { listarEnvios, getMesReferencia } from "@/lib/storage";
import { CheckCircle2, XCircle, Church } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const envios = listarEnvios();
  const mesAtual = getMesReferencia();

  const igrejasQueEnviaram = new Set(
    envios.filter((e) => e.mes_referencia === mesAtual).map((e) => e.igreja_id)
  );

  const totalIgrejas = igrejas.length;
  const enviados = igrejasQueEnviaram.size;
  const pendentes = totalIgrejas - enviados;

  return (
    <div className="space-y-4">
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
          Status das Igrejas — {mesAtual}
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
