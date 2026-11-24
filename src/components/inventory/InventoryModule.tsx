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
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useIgrejas } from "@/lib/storage";
import {
  useInventarios,
  useInventarioDetalhe,
  useCreateInventario,
  useUpdateInventario,
  useDeleteInventario,
} from "@/lib/inventoryStorage";
import { formatarDataBR, type InventarioRecord } from "@/lib/inventoryUtils";
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
  const [editingInv, setEditingInv] = useState<InventarioRecord | null>(null);
  const [editIgrejaId, setEditIgrejaId] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editData, setEditData] = useState("");
  const [editReabrir, setEditReabrir] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingInv, setDeletingInv] = useState<InventarioRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const igrejaFilterId = selectedIgrejaId ? Number(selectedIgrejaId) : undefined;
  const { data: inventarios = [], isLoading: loadingList } = useInventarios(igrejaFilterId);
  const { data: detalhe, isLoading: loadingDetalhe } = useInventarioDetalhe(activeInventarioId);
  const createInventario = useCreateInventario();
  const updateInventario = useUpdateInventario();
  const deleteInventario = useDeleteInventario();

  const openEditModal = (inv: InventarioRecord) => {
    setEditingInv(inv);
    setEditIgrejaId(String(inv.igreja_id));
    setEditResponsavel(inv.responsavel);
    setEditData(inv.data_inventario.slice(0, 10));
    setEditReabrir(false);
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInv) return;
    setEditError("");
    if (!editIgrejaId) {
      setEditError("Selecione a igreja.");
      return;
    }
    if (editResponsavel.trim().length < 2) {
      setEditError("Informe o nome do responsável.");
      return;
    }
    if (!editData) {
      setEditError("Informe a data do inventário.");
      return;
    }
    const igreja = igrejas.find((i) => i.id === Number(editIgrejaId));
    if (!igreja) return;

    try {
      await updateInventario.mutateAsync({
        id: editingInv.id,
        igreja_id: igreja.id,
        igreja_nome: igreja.nome,
        responsavel: editResponsavel.trim(),
        data_inventario: editData,
        status: editReabrir ? "em_andamento" : undefined,
      });
      setEditingInv(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInv) return;
    setDeleteError("");
    try {
      await deleteInventario.mutateAsync(deletingInv.id);
      if (activeInventarioId === deletingInv.id) {
        setActiveInventarioId(null);
      }
      setDeletingInv(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erro ao excluir inventário.");
    }
  };

  const modals = (
    <>
      {editingInv && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-card rounded-2xl card-shadow w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Editar Inventário</h3>
              <button
                type="button"
                onClick={() => setEditingInv(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Igreja</label>
              <div className="relative">
                <select
                  value={editIgrejaId}
                  onChange={(e) => setEditIgrejaId(e.target.value)}
                  className="w-full touch-target px-3.5 rounded-xl bg-secondary text-sm appearance-none"
                >
                  {igrejas.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Responsável</label>
              <input
                type="text"
                value={editResponsavel}
                onChange={(e) => setEditResponsavel(e.target.value)}
                className="w-full touch-target px-3.5 rounded-xl bg-secondary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Data do inventário</label>
              <input
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
                className="w-full touch-target px-3.5 rounded-xl bg-secondary text-sm"
              />
            </div>

            {editingInv.status === "concluido" && (
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editReabrir}
                  onChange={(e) => setEditReabrir(e.target.checked)}
                  className="rounded"
                />
                Reabrir inventário como &ldquo;Em andamento&rdquo; para continuar editando
              </label>
            )}

            {editError && <p className="text-destructive text-xs font-medium">{editError}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingInv(null)}
                className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateInventario.isPending}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {updateInventario.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingInv && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl card-shadow w-full max-w-md p-5 space-y-4">
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
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {deleteInventario.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

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
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                inventario.status === "concluido"
                  ? "bg-success/15 text-success"
                  : "bg-secondary text-foreground"
              }`}
            >
              {inventario.status === "concluido" ? "Concluído" : "Em andamento"}
            </span>
            <button
              type="button"
              onClick={() => openEditModal(inventario)}
              className="p-2 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Editar dados do inventário"
              aria-label="Editar inventário"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeletingInv(inventario)}
              className="p-2 rounded-lg bg-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              title="Excluir inventário"
              aria-label="Excluir inventário"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
        {modals}
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
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
                        onClick={() => openEditModal(inv)}
                        className="p-1.5 rounded-lg bg-card text-foreground border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                        title="Editar inventário"
                        aria-label={`Editar inventário de ${inv.igreja_nome}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingInv(inv)}
                        className="p-1.5 rounded-lg bg-card text-destructive border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="Excluir inventário"
                        aria-label={`Excluir inventário de ${inv.igreja_nome}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openExisting(inv.id, total > 0, isDone)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold"
                      >
                        {isDone ? "EDITAR / ABRIR" : "CONTINUAR"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {modals}
    </div>
  );
};

export default InventoryModule;