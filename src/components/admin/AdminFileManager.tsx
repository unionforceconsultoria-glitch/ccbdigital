import React, { useState } from "react";
import { igrejas } from "@/data/churches";
import { useEnvios, useRemoveEnvio } from "@/lib/storage";
import { ChevronRight, ChevronDown, FileText, Trash2, FolderOpen, Church, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mesesNomes: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const AdminFileManager: React.FC = () => {
  const { data: envios = [] } = useEnvios();
  const removeEnvio = useRemoveEnvio();
  const [openIgreja, setOpenIgreja] = useState<number | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este documento?")) return;
    removeEnvio.mutate(id);
  };

  // Group envios by igreja
  const byIgreja = igrejas.map((igreja) => {
    const igEnvios = envios.filter((e) => e.igreja_id === igreja.id);
    // Group by month
    const byMonth: Record<string, typeof igEnvios> = {};
    igEnvios.forEach((e) => {
      if (!byMonth[e.mes_referencia]) byMonth[e.mes_referencia] = [];
      byMonth[e.mes_referencia].push(e);
    });
    return { igreja, envios: igEnvios, byMonth };
  });

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-primary flex items-center gap-2 mb-3">
        <FolderOpen className="w-5 h-5" />
        Arquivos por Igreja
      </h3>

      {byIgreja.map(({ igreja, envios: igEnvios, byMonth }) => {
        const isOpen = openIgreja === igreja.id;
        const months = Object.keys(byMonth).sort().reverse();

        return (
          <div key={igreja.id} className="bg-card rounded-xl card-shadow overflow-hidden">
            <button
              onClick={() => setOpenIgreja(isOpen ? null : igreja.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Church className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold truncate">{igreja.nome}</span>
                <span className="text-xs text-muted-foreground">
                  ({igEnvios.length} {igEnvios.length === 1 ? "arquivo" : "arquivos"})
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {months.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-4 px-4">
                      Nenhum arquivo enviado.
                    </p>
                  ) : (
                    <div className="px-3 pb-3 space-y-1">
                      {months.map((month) => {
                        const monthKey = `${igreja.id}-${month}`;
                        const isMonthOpen = openMonth === monthKey;
                        const [year, m] = month.split("-");
                        const monthLabel = `${mesesNomes[m] || m} / ${year}`;

                        return (
                          <div key={month} className="bg-secondary rounded-lg overflow-hidden">
                            <button
                              onClick={() => setOpenMonth(isMonthOpen ? null : monthKey)}
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold">{monthLabel}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({byMonth[month].length})
                                </span>
                              </div>
                              {isMonthOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>

                            <AnimatePresence>
                              {isMonthOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-2 pb-2 space-y-1">
                                    {byMonth[month].map((envio) => (
                                      <div
                                        key={envio.id}
                                        className="flex items-center justify-between bg-background rounded-lg px-3 py-2"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <span className="text-xs font-medium truncate">
                                              {envio.tipo_formulario}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground mt-0.5 ml-5.5">
                                            {envio.protocolo} · {envio.nome_responsavel}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleDelete(envio.id)}
                                          className="text-destructive hover:text-destructive/80 shrink-0 ml-2 p-1"
                                          title="Excluir documento"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default AdminFileManager;
