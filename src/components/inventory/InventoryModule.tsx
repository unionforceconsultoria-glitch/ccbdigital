import React, { useState } from "react";
import {
  ClipboardList,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileDown,
} from "lucide-react";
import { useIgrejas } from "@/lib/storage";
import {
  useInventarios,
  useInventarioDetalhe,
  useCreateInventario,
} from "@/lib/inventoryStorage";
import { formatarDataBR } from "@/lib/inventoryUtils";
import InventoryImportStep from "./InventoryImportStep";
import InventoryCheckStep from "./InventoryCheckStep";
import InventoryExtrasAndSummary from "./InventoryExtrasAndSummary";

type ActiveStep = "import" | "check" | "summary";

const InventoryModule: React.FC = () => {
  const { data: igrejas = [] } = useIgrejas();
  const [selectedIgrejaId, setSelectedIgrejaId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [formError, setFormError] = useState("");
  const [activeInventarioId, setActiveInventarioId] = useState<string | null>(null);
  const [step, setStep] = useState<ActiveStep>("import");

  const igrejaFilterId = selectedIgrejaId ? Number(selectedIgrejaId) : undefined;
  const { data: inventarios = [], isLoading: loadingList } = useInventarios(igrejaFilterId);
  const { data: detalhe, isLoading: loadingDetalhe } = useInventarioDetalhe(activeInventarioId);
  const createInventario = useCreateInventario();

  const handleStartNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!selectedIgrejaId) {
      setFormError("Selecione a igreja antes de iniciar o inventário.");
      return;
    }
    if (responsavel.trim().length < 2) {
      setFormError("Informe o nome do responsável pelo inventário.");
      return;
    }
    const igreja = igrejas.find((i) => i.id === Number(selectedIgrejaId));
    if (!igreja) return;

    try {
      const novo = await createInventario.mutateAsync({
        igreja_id: igreja.id,
        igreja_nome: igreja.nome,
        responsavel: responsavel.trim(),
        tipo_procedimento: "anual",
      });
      setActiveInventarioId(novo.id);
      setStep("import");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao iniciar inventário.");
    }
  };

  const openExisting = (invId: string, hasItems: boolean, isConcluded: boolean) => {
    setActiveInventarioId(invId);
    if (isConcluded) setStep("summary");
    else if (hasItems) setStep("check");
    else setStep("import");
  };

  // Fluxo de inventário ativo
  if (activeInventarioId) {
    if (loadingDetalhe || !detalhe) {
      return (
        <div className="bg-card rounded-2xl card-shadow p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando inventário...
        </div>
      );
    }

    const { inventario, itens, bensExtras } = detalhe;

    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl card-shadow p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setActiveInventarioId(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao histórico
            </button>
            <h2 className="font-bold text-primary text-base truncate">{inventario.igreja_nome}</h2>
            <p className="text-xs text-muted-foreground">
              {formatarDataBR(inventario.data_inventario)} · {inventario.responsavel}
            </p>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
              inventario.status === "concluido"
                ? "bg-success/15 text-success"
                : "bg-secondary text-foreground"
            }`}
          >
            {inventario.status === "concluido" ? "Concluído" : "Em andamento"}
          </span>
        </div>

        {/* Indicador de etapas */}
        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setStep("import")}
            className={`py-2 rounded-xl ${step === "import" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            1. PDF / Itens
          </button>
          <button
            type="button"
            disabled={itens.length === 0}
            onClick={() => setStep("check")}
            className={`py-2 rounded-xl disabled:opacity-40 ${step === "check" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            2. Conferência
          </button>
          <button
            type="button"
            disabled={itens.length === 0}
            onClick={() => setStep("summary")}
            className={`py-2 rounded-xl disabled:opacity-40 ${step === "summary" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            3. Finalizar
          </button>
        </div>

        {step === "import" && (
          <InventoryImportStep
            inventario={inventario}
            initialItems={
              itens.length > 0
                ? itens.map((i) => ({
                    codigo_patrimonial: i.codigo_patrimonial,
                    descricao: i.descricao,
                    categoria: i.categoria,
                    localizacao: i.localizacao,
                    quantidade: i.quantidade_esperada,
                  }))
                : inventario.dados_extraidos_json || []
            }
            onDone={() => setStep("check")}
          />
        )}

        {step === "check" && (
          <InventoryCheckStep
            inventario={inventario}
            itens={itens}
            onAdvance={() => setStep("summary")}
            onBackToImport={() => setStep("import")}
          />
        )}

        {step === "summary" && (
          <InventoryExtrasAndSummary
            inventario={inventario}
            itens={itens}
            bensExtras={bensExtras}
            onBackToCheck={() => setStep("check")}
          />
        )}
      </div>
    );
  }

  // Tela inicial do Inventário Patrimonial
  return (
    <div className="space-y-4">
      <form onSubmit={handleStartNew} className="bg-card rounded-2xl card-shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Inventário Patrimonial
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Selecione a igreja para iniciar uma conferência patrimonial ou continuar um inventário salvo.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Igreja</label>
          <div className="relative">
            <select
              value={selectedIgrejaId}
              onChange={(e) => setSelectedIgrejaId(e.target.value)}
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base appearance-none cursor-pointer"
            >
              <option value="">Selecione a igreja</option>
              {igrejas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Responsável</label>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do responsável pela conferência"
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base"
          />
        </div>

        {formError && <p className="text-destructive text-sm font-medium">{formError}</p>}

        <button
          type="submit"
          disabled={createInventario.isPending}
          className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-base flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
        >
          {createInventario.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              INICIANDO...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              INICIAR NOVO INVENTÁRIO
            </>
          )}
        </button>
      </form>

      {/* Histórico de inventários */}
      <div className="bg-card rounded-2xl card-shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-primary">Histórico de Inventários</h3>
          {selectedIgrejaId && (
            <button
              type="button"
              onClick={() => setSelectedIgrejaId("")}
              className="text-xs text-muted-foreground underline"
            >
              Ver todas
            </button>
          )}
        </div>

        {loadingList ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando histórico...</p>
        ) : inventarios.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum inventário registrado{selectedIgrejaId ? " para esta igreja" : " ainda"}.
          </p>
        ) : (
          <div className="space-y-2.5">
            {inventarios.map((inv) => {
              const total = inv.resumo_json?.total_itens ?? 0;
              const conf = inv.resumo_json?.conferidos ?? 0;
              const isDone = inv.status === "concluido";
              return (
                <div
                  key={inv.id}
                  className="bg-secondary/70 rounded-xl p-4 space-y-2.5 border-l-4 border-l-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{inv.igreja_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarDataBR(inv.data_inventario)} · {inv.responsavel}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        isDone ? "bg-success/15 text-success" : "bg-card text-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {isDone ? "Concluído" : "Em andamento"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      Conferidos: <strong className="text-foreground">{conf}/{total}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {inv.relatorio_final_url && (
                        <a
                          href={inv.relatorio_final_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-card text-foreground font-bold flex items-center gap-1 border border-border"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openExisting(inv.id, total > 0, isDone)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold"
                      >
                        {isDone ? "ABRIR" : "CONTINUAR"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryModule;