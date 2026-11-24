import React, { useMemo, useState } from "react";
import {
  Hash,
  ScanBarcode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Tag,
  ArrowRight,
  Camera,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import {
  type InventarioItem,
  type InventarioRecord,
  type StatusEtiqueta,
  ETIQUETA_LABELS,
  agruparItensParaConferencia,
  encontrarItemPorCodigo,
  somenteAlfanumerico,
} from "@/lib/inventoryUtils";
import { useUpdateGrupoQuantidade, useUpdateInventarioItem } from "@/lib/inventoryStorage";
import BarcodeScannerModal from "./BarcodeScannerModal";

interface InventoryCheckStepProps {
  inventario: InventarioRecord;
  itens: InventarioItem[];
  onAdvance: () => void;
  onBackToImport: () => void;
}

type CheckMode = "quantidade" | "etiqueta" | "manual";

const ETIQUETA_OPTIONS: StatusEtiqueta[] = [
  "presente_legivel",
  "ausente",
  "danificada",
  "ilegivel",
  "necessita_substituicao",
];

const InventoryCheckStep: React.FC<InventoryCheckStepProps> = ({
  inventario,
  itens,
  onAdvance,
  onBackToImport,
}) => {
  const [mode, setMode] = useState<CheckMode>("quantidade");
  const [showCamera, setShowCamera] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: "found" | "duplicate" | "not_found";
    code: string;
    item?: InventarioItem;
  } | null>(null);
  const [scanEtiqueta, setScanEtiqueta] = useState<StatusEtiqueta>("presente_legivel");
  const [busca, setBusca] = useState("");
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const updateItem = useUpdateInventarioItem();
  const updateGrupo = useUpdateGrupoQuantidade();

  const grupos = useMemo(() => agruparItensParaConferencia(itens), [itens]);
  const conferidos = itens.filter((i) => i.status_conferencia !== "pendente").length;
  const progresso = itens.length > 0 ? Math.round((conferidos / itens.length) * 100) : 0;

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    const qAlnum = somenteAlfanumerico(q);
    return itens.filter(
      (i) =>
        i.descricao.toLowerCase().includes(q) ||
        (i.codigo_patrimonial || "").toLowerCase().includes(q) ||
        (qAlnum.length > 0 && somenteAlfanumerico(i.codigo_patrimonial || "").includes(qAlnum)) ||
        i.categoria.toLowerCase().includes(q),
    );
  }, [itens, busca]);

  const handleBarcodeRead = (rawCode: string) => {
    setShowCamera(false);
    const match = encontrarItemPorCodigo(itens, rawCode);
    if (!match) {
      setScanFeedback({ type: "not_found", code: rawCode });
      return;
    }
    if (match.status_conferencia === "encontrado") {
      setScanFeedback({ type: "duplicate", code: rawCode, item: match });
      return;
    }
    setScanEtiqueta("presente_legivel");
    setScanFeedback({ type: "found", code: rawCode, item: match });
  };

  const confirmarLeituraEtiqueta = async () => {
    if (!scanFeedback?.item) return;
    const item = scanFeedback.item;
    setSavingId(item.id);
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        inventarioId: inventario.id,
        status_conferencia: "encontrado",
        status_etiqueta: scanEtiqueta,
        quantidade_encontrada: item.quantidade_esperada || 1,
        metodo_conferencia: "etiqueta",
        observacoes: item.observacoes,
      });
      setScanFeedback({ type: "duplicate", code: scanFeedback.code, item: { ...item, status_conferencia: "encontrado", status_etiqueta: scanEtiqueta } });
    } finally {
      setSavingId(null);
    }
  };

  const salvarGrupoQuantidade = async (grupoKey: string, grupoItens: InventarioItem[], novaQtd: number) => {
    setSavingId(grupoKey);
    try {
      await updateGrupo.mutateAsync({
        inventarioId: inventario.id,
        itens: grupoItens,
        quantidadeEncontradaTotal: Math.max(0, novaQtd),
      });
    } finally {
      setSavingId(null);
    }
  };

  const salvarItemManual = async (
    item: InventarioItem,
    status: "encontrado" | "nao_encontrado",
    etiqueta: StatusEtiqueta,
  ) => {
    setSavingId(item.id);
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        inventarioId: inventario.id,
        status_conferencia: status,
        status_etiqueta: status === "encontrado" ? etiqueta : item.status_etiqueta,
        quantidade_encontrada: status === "encontrado" ? item.quantidade_esperada || 1 : 0,
        metodo_conferencia: "manual",
        observacoes: item.observacoes,
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {showCamera && <BarcodeScannerModal onScan={handleBarcodeRead} onClose={() => setShowCamera(false)} />}

      {/* Barra de progresso */}
      <div className="bg-card rounded-2xl card-shadow p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-primary">Progresso da Conferência</span>
          <span className="text-muted-foreground font-semibold tabular-nums">
            {conferidos} / {itens.length} ({progresso}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-300 rounded-full"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Save className="w-3.5 h-3.5 text-success" />
            Progresso salvo automaticamente
          </span>
          <button type="button" onClick={onBackToImport} className="underline hover:text-foreground">
            Editar lista importada
          </button>
        </div>
      </div>

      {/* Seletor das 3 formas de conferência */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("quantidade")}
          className={`touch-target rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all px-2 ${
            mode === "quantidade"
              ? "bg-primary text-primary-foreground card-shadow"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <Hash className="w-5 h-5" />
          Quantidade
        </button>
        <button
          type="button"
          onClick={() => setMode("etiqueta")}
          className={`touch-target rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all px-2 ${
            mode === "etiqueta"
              ? "bg-primary text-primary-foreground card-shadow"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <ScanBarcode className="w-5 h-5" />
          Etiqueta
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`touch-target rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all px-2 ${
            mode === "manual"
              ? "bg-primary text-primary-foreground card-shadow"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <Search className="w-5 h-5" />
          Busca Manual
        </button>
      </div>

      {/* A) POR QUANTIDADE */}
      {mode === "quantidade" && (
        <div className="space-y-3">
          {grupos.map((g) => {
            const draftVal = qtyDrafts[g.grupo_chave];
            const currentVal = draftVal !== undefined ? Number(draftVal) : g.conferidos_count > 0 ? g.quantidade_encontrada : g.quantidade_esperada;
            const diff = currentVal - g.quantidade_esperada;
            const isSaving = savingId === g.grupo_chave;

            return (
              <div key={g.grupo_chave} className="bg-card rounded-2xl card-shadow p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground">{g.descricao}</h4>
                    <p className="text-xs text-muted-foreground">
                      {g.categoria} · Qtd cadastrada: <strong className="text-foreground tabular-nums">{g.quantidade_esperada}</strong>
                    </p>
                  </div>
                  {g.todos_conferidos && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        g.diferenca === 0
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-foreground"
                      }`}
                    >
                      {g.diferenca === 0 ? "OK" : g.diferenca > 0 ? `+${g.diferenca}` : String(g.diferenca)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQtyDrafts((p) => ({
                        ...p,
                        [g.grupo_chave]: String(Math.max(0, currentVal - 1)),
                      }))
                    }
                    className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-foreground"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={draftVal !== undefined ? draftVal : String(currentVal)}
                    onChange={(e) => setQtyDrafts((p) => ({ ...p, [g.grupo_chave]: e.target.value }))}
                    className="flex-1 h-11 text-center font-bold text-base rounded-xl bg-secondary border border-border tabular-nums"
                    aria-label={`Quantidade encontrada de ${g.descricao}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQtyDrafts((p) => ({
                        ...p,
                        [g.grupo_chave]: String(currentVal + 1),
                      }))
                    }
                    className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-foreground"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => salvarGrupoQuantidade(g.grupo_chave, g.itens, currentVal)}
                    className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {isSaving ? "..." : "CONFIRMAR"}
                  </button>
                </div>

                {diff !== 0 && (
                  <p className="text-xs font-medium text-destructive">
                    Diferença calculada: {diff > 0 ? `+${diff} excedente(s)` : `${Math.abs(diff)} faltante(s)`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* B) POR LEITURA DE ETIQUETA */}
      {mode === "etiqueta" && (
        <div className="bg-card rounded-2xl card-shadow p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Abra a câmera para ler o QR Code ou código de barras da etiqueta patrimonial. Leituras duplicadas são bloqueadas automaticamente.
          </p>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
          >
            <Camera className="w-5 h-5" />
            ABRIR CÂMERA PARA LER ETIQUETA
          </button>

          {scanFeedback && (
            <div className="rounded-xl p-4 border border-border bg-secondary/50 space-y-3">
              {scanFeedback.type === "not_found" && (
                <div className="flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Código não encontrado no inventário</p>
                    <p className="text-xs mt-0.5">
                      Código lido: <strong>{scanFeedback.code}</strong>. Se o bem existe na igreja, registre-o em "Bens Extras" na etapa final.
                    </p>
                  </div>
                </div>
              )}

              {scanFeedback.type === "duplicate" && scanFeedback.item && (
                <div className="flex items-start gap-2 text-success text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Patrimônio já conferido</p>
                    <p className="text-xs text-foreground mt-0.5">
                      {scanFeedback.item.codigo_patrimonial} — {scanFeedback.item.descricao}
                    </p>
                  </div>
                </div>
              )}

              {scanFeedback.type === "found" && scanFeedback.item && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase">Patrimônio localizado</span>
                    <p className="font-bold text-base text-foreground">{scanFeedback.item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: <strong>{scanFeedback.item.codigo_patrimonial}</strong> · {scanFeedback.item.categoria}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Situação da etiqueta</label>
                    <select
                      value={scanEtiqueta}
                      onChange={(e) => setScanEtiqueta(e.target.value as StatusEtiqueta)}
                      className="w-full h-11 px-3 rounded-xl bg-card border border-border text-sm"
                    >
                      {ETIQUETA_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {ETIQUETA_LABELS[opt]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={savingId === scanFeedback.item.id}
                    onClick={confirmarLeituraEtiqueta}
                    className="w-full touch-target bg-success text-success-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    CONFIRMAR PATRIMÔNIO ENCONTRADO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* C) BUSCA MANUAL */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por código patrimonial ou descrição..."
              className="w-full touch-target pl-10 pr-4 rounded-xl bg-card card-shadow text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Regra de etiquetas: bem encontrado fisicamente sem etiqueta continua como <strong>Encontrado</strong> com pendência de regularização de etiqueta.
          </p>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {itensFiltrados.map((item) => {
              const isSaving = savingId === item.id;
              return (
                <div key={item.id} className="bg-card rounded-2xl card-shadow p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        Código: <strong className="text-foreground">{item.codigo_patrimonial || "Sem código"}</strong> · {item.categoria}
                        {item.localizacao ? ` · ${item.localizacao}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.status_conferencia === "encontrado"
                          ? "bg-success/15 text-success"
                          : item.status_conferencia === "nao_encontrado"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {item.status_conferencia === "encontrado"
                        ? "Encontrado"
                        : item.status_conferencia === "nao_encontrado"
                          ? "Não encontrado"
                          : item.status_conferencia === "divergencia"
                            ? "Divergência"
                            : "Pendente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <select
                      value={item.status_etiqueta}
                      disabled={isSaving}
                      onChange={(e) =>
                        salvarItemManual(
                          item,
                          item.status_conferencia === "nao_encontrado" ? "encontrado" : "encontrado",
                          e.target.value as StatusEtiqueta,
                        )
                      }
                      className="flex-1 h-9 px-2.5 rounded-lg bg-secondary text-xs font-medium border border-border"
                      aria-label="Situação da etiqueta"
                    >
                      {ETIQUETA_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          Etiqueta: {ETIQUETA_LABELS[opt]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => salvarItemManual(item, "encontrado", item.status_etiqueta)}
                      className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        item.status_conferencia === "encontrado"
                          ? "bg-success text-success-foreground"
                          : "bg-secondary text-foreground hover:bg-success/15"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ENCONTRADO
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => salvarItemManual(item, "nao_encontrado", item.status_etiqueta)}
                      className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        item.status_conferencia === "nao_encontrado"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary text-foreground hover:bg-destructive/15"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      NÃO ENCONTRADO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAdvance}
        className="w-full touch-target bg-foreground text-background font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
      >
        AVANÇAR PARA BENS EXTRAS E FINALIZAÇÃO
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default InventoryCheckStep;