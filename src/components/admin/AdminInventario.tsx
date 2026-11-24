import React, { useMemo, useState } from "react";
import { ClipboardList, FileDown, Filter, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { useIgrejas } from "@/lib/storage";
import { useInventarios, useAllInventarioItens, useDeleteInventario } from "@/lib/inventoryStorage";
import { calcularResumoInventario, formatarDataBR, type InventarioRecord } from "@/lib/inventoryUtils";
import {
  gerarRelatorioIndividualPdf,
  gerarRelatorioGeralPdf,
  gerarRelatorioNaoEncontradosPdf,
  gerarRelatorioEtiquetasFaltantesPdf,
  gerarRelatorioEtiquetasDanificadasPdf,
  gerarRelatorioDivergenciasPdf,
  gerarRelatorioBensExtrasPdf,
} from "@/lib/inventoryPdf";

type PendenciaFiltro =
  | "todas"
  | "com_pendencia"
  | "faltantes"
  | "sem_etiqueta"
  | "danificadas"
  | "divergencias"
  | "extras"
  | "sem_inventario";

const AdminInventario: React.FC = () => {
  const { data: igrejas = [] } = useIgrejas();
  const { data: inventarios = [] } = useInventarios();
  const { data: allData } = useAllInventarioItens();
  const deleteInventario = useDeleteInventario();

  const [filtroIgreja, setFiltroIgreja] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroPendencia, setFiltroPendencia] = useState<PendenciaFiltro>("todas");
  const [deletingInv, setDeletingInv] = useState<InventarioRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const allItens = allData?.itens ?? [];
  const allExtras = allData?.bensExtras ?? [];

  // Períodos disponíveis (YYYY-MM) nos inventários reais
  const periodos = useMemo(() => {
    const set = new Set<string>();
    for (const inv of inventarios) {
      if (inv.data_inventario) set.add(inv.data_inventario.slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [inventarios]);

  const inventariosFiltradosPeriodo = useMemo(() => {
    return inventarios.filter((inv) => {
      if (filtroPeriodo && !inv.data_inventario.startsWith(filtroPeriodo)) return false;
      if (filtroIgreja && inv.igreja_id !== Number(filtroIgreja)) return false;
      return true;
    });
  }, [inventarios, filtroPeriodo, filtroIgreja]);

  // Último inventário por igreja no período filtrado
  const latestByIgreja = useMemo(() => {
    const map = new Map<number, (typeof inventarios)[number]>();
    for (const inv of inventariosFiltradosPeriodo) {
      if (!map.has(inv.igreja_id)) map.set(inv.igreja_id, inv);
    }
    return map;
  }, [inventariosFiltradosPeriodo]);

  const rowsPorIgreja = useMemo(() => {
    return igrejas
      .filter((ig) => !filtroIgreja || ig.id === Number(filtroIgreja))
      .map((ig) => {
        const inv = latestByIgreja.get(ig.id) || null;
        if (!inv) {
          return {
            igreja: ig,
            inventario: null,
            resumo: {
              total_itens: 0,
              conferidos: 0,
              pendentes: 0,
              encontrados: 0,
              nao_encontrados: 0,
              divergencias: 0,
              sem_etiqueta: 0,
              etiquetas_danificadas: 0,
              bens_extras: 0,
            },
            temPendencia: false,
            situacao: "Sem inventário",
          };
        }
        const itens = allItens.filter((i) => i.inventario_id === inv.id);
        const extras = allExtras.filter((e) => e.inventario_id === inv.id);
        const resumo = calcularResumoInventario(itens, extras);
        const temPendencia =
          resumo.nao_encontrados > 0 ||
          resumo.sem_etiqueta > 0 ||
          resumo.etiquetas_danificadas > 0 ||
          resumo.divergencias > 0 ||
          resumo.bens_extras > 0;
        const situacao =
          inv.status === "em_andamento"
            ? "Em andamento"
            : temPendencia
              ? "Com pendências"
              : "Regular";
        return { igreja: ig, inventario: inv, resumo, temPendencia, situacao };
      });
  }, [igrejas, filtroIgreja, latestByIgreja, allItens, allExtras]);

  const rowsVisiveis = useMemo(() => {
    return rowsPorIgreja.filter((r) => {
      switch (filtroPendencia) {
        case "com_pendencia":
          return r.temPendencia;
        case "faltantes":
          return r.resumo.nao_encontrados > 0;
        case "sem_etiqueta":
          return r.resumo.sem_etiqueta > 0;
        case "danificadas":
          return r.resumo.etiquetas_danificadas > 0;
        case "divergencias":
          return r.resumo.divergencias > 0;
        case "extras":
          return r.resumo.bens_extras > 0;
        case "sem_inventario":
          return !r.inventario;
        default:
          return true;
      }
    });
  }, [rowsPorIgreja, filtroPendencia]);

  // Indicadores globais reais
  const indicadores = useMemo(() => {
    const realizadas = rowsPorIgreja.filter((r) => r.inventario !== null);
    return {
      totalIgrejas: rowsPorIgreja.length,
      realizaram: realizadas.length,
      comPendencias: realizadas.filter((r) => r.temPendencia).length,
      naoEncontrados: realizadas.reduce((s, r) => s + r.resumo.nao_encontrados, 0),
      semEtiqueta: realizadas.reduce((s, r) => s + r.resumo.sem_etiqueta, 0),
      etiquetasDanificadas: realizadas.reduce((s, r) => s + r.resumo.etiquetas_danificadas, 0),
      divergencias: realizadas.reduce((s, r) => s + r.resumo.divergencias, 0),
      bensExtras: realizadas.reduce((s, r) => s + r.resumo.bens_extras, 0),
    };
  }, [rowsPorIgreja]);

  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <h2 className="font-bold text-primary text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Inventário Patrimonial — Painel Geral
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Indicadores em tempo real das conferências patrimoniais de todas as igrejas.
        </p>
      </div>

      {/* 8 Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Igrejas cadastradas", val: indicadores.totalIgrejas, cls: "text-primary" },
          { label: "Realizaram inventário", val: indicadores.realizaram, cls: "text-success" },
          { label: "Igrejas com pendências", val: indicadores.comPendencias, cls: "text-destructive" },
          { label: "Bens não encontrados", val: indicadores.naoEncontrados, cls: "text-destructive" },
          { label: "Bens sem etiqueta", val: indicadores.semEtiqueta, cls: "text-foreground" },
          { label: "Etiquetas danificadas", val: indicadores.etiquetasDanificadas, cls: "text-foreground" },
          { label: "Divergências", val: indicadores.divergencias, cls: "text-foreground" },
          { label: "Bens extras", val: indicadores.bensExtras, cls: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="bg-background rounded-2xl card-shadow p-3.5 text-center">
            <p className={`text-2xl font-bold tabular-nums ${card.cls}`}>{card.val}</p>
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-background rounded-2xl card-shadow p-4 space-y-3">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
          <Filter className="w-4 h-4" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <select
              value={filtroIgreja}
              onChange={(e) => setFiltroIgreja(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-secondary text-xs font-medium appearance-none"
              aria-label="Filtrar por igreja"
            >
              <option value="">Todas as igrejas</option>
              {igrejas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-secondary text-xs font-medium appearance-none"
              aria-label="Filtrar por período"
            >
              <option value="">Todos os períodos</option>
              {periodos.map((p) => (
                <option key={p} value={p}>
                  {p.split("-").reverse().join("/")}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filtroPendencia}
              onChange={(e) => setFiltroPendencia(e.target.value as PendenciaFiltro)}
              className="w-full h-11 px-3 rounded-xl bg-secondary text-xs font-medium appearance-none"
              aria-label="Filtrar por tipo de pendência"
            >
              <option value="todas">Todas as situações</option>
              <option value="com_pendencia">Apenas com pendências</option>
              <option value="faltantes">Com bens faltantes</option>
              <option value="sem_etiqueta">Com bens sem etiqueta</option>
              <option value="danificadas">Com etiquetas danificadas</option>
              <option value="divergencias">Com divergências</option>
              <option value="extras">Com bens extras</option>
              <option value="sem_inventario">Sem inventário</option>
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Relatórios em PDF */}
      <div className="bg-background rounded-2xl card-shadow p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
          <FileDown className="w-4 h-4" />
          Relatórios em PDF
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => gerarRelatorioGeralPdf(inventariosFiltradosPeriodo, allItens, allExtras)}
            className="px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold text-left hover:brightness-110"
          >
            Relatório Geral
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorioNaoEncontradosPdf(inventariosFiltradosPeriodo, allItens)}
            className="px-3 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold text-left hover:brightness-95 border border-border"
          >
            Bens Não Encontrados
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorioEtiquetasFaltantesPdf(inventariosFiltradosPeriodo, allItens)}
            className="px-3 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold text-left hover:brightness-95 border border-border"
          >
            Etiquetas Faltantes
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorioEtiquetasDanificadasPdf(inventariosFiltradosPeriodo, allItens)}
            className="px-3 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold text-left hover:brightness-95 border border-border"
          >
            Etiquetas Danificadas
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorioDivergenciasPdf(inventariosFiltradosPeriodo, allItens)}
            className="px-3 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold text-left hover:brightness-95 border border-border"
          >
            Divergências
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorioBensExtrasPdf(inventariosFiltradosPeriodo, allExtras)}
            className="px-3 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold text-left hover:brightness-95 border border-border"
          >
            Bens Extras
          </button>
        </div>
      </div>

      {/* Tabela por Igreja */}
      <div className="bg-background rounded-2xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/80 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-3 font-bold">Igreja</th>
                <th className="text-center px-2 py-3 font-bold">Faltantes</th>
                <th className="text-center px-2 py-3 font-bold">Sem Etiq.</th>
                <th className="text-center px-2 py-3 font-bold">Diverg.</th>
                <th className="text-left px-3 py-3 font-bold">Situação</th>
                <th className="text-right px-3 py-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rowsVisiveis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhuma igreja corresponde aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                rowsVisiveis.map((r) => (
                  <tr key={r.igreja.id} className="hover:bg-secondary/40">
                    <td className="px-3 py-2.5 font-semibold text-foreground">{r.igreja.nome}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums font-bold text-destructive">
                      {r.resumo.nao_encontrados}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{r.resumo.sem_etiqueta}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{r.resumo.divergencias}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.situacao === "Regular"
                            ? "bg-success/15 text-success"
                            : r.situacao === "Com pendências"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.situacao}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.inventario ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const itens = allItens.filter((i) => i.inventario_id === r.inventario!.id);
                              const extras = allExtras.filter((e) => e.inventario_id === r.inventario!.id);
                              gerarRelatorioIndividualPdf(r.inventario!, itens, extras).download();
                            }}
                            className="p-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Baixar relatório individual em PDF"
                            aria-label={`Baixar PDF de ${r.igreja.nome}`}
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingInv(r.inventario);
                              setDeleteError("");
                            }}
                            className="p-1.5 rounded-lg bg-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            title="Excluir inventário"
                            aria-label={`Excluir inventário de ${r.igreja.nome}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deletingInv && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl card-shadow w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-destructive">Excluir Inventário</h3>
            <p className="text-sm text-foreground">
              Deseja realmente excluir o inventário de{" "}
              <strong>{deletingInv.igreja_nome}</strong> ({formatarDataBR(deletingInv.data_inventario)})?
            </p>
            <p className="text-xs text-muted-foreground">
              Todos os itens conferidos e bens extras deste inventário serão removidos permanentemente.
            </p>
            {deleteError && <p className="text-destructive text-xs font-medium">{deleteError}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeletingInv(null);
                  setDeleteError("");
                }}
                className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteInventario.isPending}
                onClick={async () => {
                  try {
                    await deleteInventario.mutateAsync(deletingInv.id);
                    setDeletingInv(null);
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : "Erro ao excluir inventário.");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {deleteInventario.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventario;