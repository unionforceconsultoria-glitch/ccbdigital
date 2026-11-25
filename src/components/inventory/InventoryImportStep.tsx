import React, { useRef, useState } from "react";
import { FileUp, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Layers, ArrowRight } from "lucide-react";
import {
  type ExtractedInventoryItem,
  type InventarioRecord,
  normalizarChaveGrupo,
  obterDescricaoGrupo,
  formatarDependenciasGrupo,
} from "@/lib/inventoryUtils";
import { uploadInventoryPdf, extrairItensDoPdf, useSaveExtractedItems } from "@/lib/inventoryStorage";
import { extrairItensDoPdfLocal } from "@/lib/inventoryPdfParser";

interface InventoryImportStepProps {
  inventario: InventarioRecord;
  initialItems?: ExtractedInventoryItem[];
  onDone: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const idx = res.indexOf(",");
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

const InventoryImportStep: React.FC<InventoryImportStepProps> = ({ inventario, initialItems = [], onDone }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<ExtractedInventoryItem[]>(initialItems);
  const [pdfUrl, setPdfUrl] = useState<string | null>(inventario.pdf_original_url);
  const [pdfNome, setPdfNome] = useState<string | null>(inventario.pdf_original_nome);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [obsDoc, setObsDoc] = useState<string | null>(null);
  const saveItems = useSaveExtractedItems();

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um arquivo em formato PDF.");
      return;
    }

    setError("");
    setObsDoc(null);
    setLoadingPdf(true);
    try {
      setStatusMsg("Lendo PDF...");
      setPdfNome(file.name);

      // Inicia o upload em paralelo enquanto tenta a leitura local instantânea
      const uploadPromise = uploadInventoryPdf(file, "originais", file.name);
      const localResult = await extrairItensDoPdfLocal(file);

      if (localResult.itens.length > 0) {
        setItens(localResult.itens);
        setObsDoc(localResult.observacoes_documento);
        const url = await uploadPromise;
        setPdfUrl(url);
      } else {
        setStatusMsg("Aplicando OCR no PDF digitalizado...");
        const url = await uploadPromise;
        setPdfUrl(url);

        const useBase64 = file.size <= 4 * 1024 * 1024;
        const payload = useBase64
          ? { fileBase64: await fileToBase64(file), filename: file.name }
          : { fileUrl: url, filename: file.name };

        const result = await extrairItensDoPdf(payload);
        setItens(result.itens);
        setObsDoc(result.observacoes_documento);
        if (result.itens.length === 0) {
          setError("Nenhum bem foi identificado automaticamente no PDF. Você pode adicionar os itens manualmente abaixo.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar o PDF.");
    } finally {
      setLoadingPdf(false);
      setStatusMsg("");
    }
  };

  const updateItem = (idx: number, patch: Partial<ExtractedInventoryItem>) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addManualItem = () => {
    setItens((prev) => [
      { codigo_patrimonial: "", descricao: "", categoria: "Mobiliário", localizacao: "", quantidade: 1 },
      ...prev,
    ]);
  };

  const removeItem = (idx: number) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    const validos = itens.filter((i) => i.descricao.trim().length > 0);
    if (validos.length === 0) {
      setError("Adicione ou importe pelo menos um bem patrimonial antes de iniciar a conferência.");
      return;
    }
    setError("");
    try {
      await saveItems.mutateAsync({
        inventarioId: inventario.id,
        responsavel: inventario.responsavel,
        pdfUrl,
        pdfNome,
        itens: validos,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar os itens do inventário.");
    }
  };

  // Prévia de agrupamento automático
  const gruposPreview = React.useMemo(() => {
    const map = new Map<string, { descricao: string; categoria: string; total: number; itens: ExtractedInventoryItem[] }>();
    for (const item of itens) {
      if (!item.descricao.trim()) continue;
      const key = normalizarChaveGrupo(item.descricao, item.categoria);
      const existing = map.get(key);
      const qty = Math.max(1, Number(item.quantidade) || 1);
      if (existing) {
        existing.total += qty;
        existing.itens.push(item);
      } else {
        map.set(key, {
          descricao: obterDescricaoGrupo(item.descricao),
          categoria: item.categoria || "Geral",
          total: qty,
          itens: [item],
        });
      }
    }
    return Array.from(map.values())
      .map((g) => ({
        descricao: g.descricao,
        categoria: g.categoria,
        total: g.total,
        dependencias: formatarDependenciasGrupo(g.itens),
      }))
      .sort((a, b) => b.total - a.total);
  }, [itens]);

  return (
    <div className="space-y-4">
      {/* Importação do PDF */}
      <div className="bg-card rounded-2xl card-shadow p-5 space-y-3">
        <h3 className="text-base font-bold text-primary">1. Importar PDF do Inventário Original</h3>
        <p className="text-xs text-muted-foreground">
          Envie o PDF do inventário patrimonial da igreja ({inventario.igreja_nome}). O sistema extrai os códigos, descrições, categorias e agrupa bens repetidos automaticamente.
        </p>

        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} className="hidden" />

        <button
          type="button"
          disabled={loadingPdf}
          onClick={() => fileRef.current?.click()}
          className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loadingPdf ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {statusMsg || "Processando PDF..."}
            </>
          ) : (
            <>
              <FileUp className="w-5 h-5" />
              {pdfNome ? "IMPORTAR OUTRO PDF" : "SELECIONAR PDF DO INVENTÁRIO"}
            </>
          )}
        </button>

        {pdfNome && !loadingPdf && (
          <div className="flex items-center gap-2 text-xs text-foreground bg-secondary px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="truncate font-medium">PDF carregado: {pdfNome}</span>
          </div>
        )}

        {obsDoc && (
          <p className="text-xs text-muted-foreground bg-secondary/70 px-3 py-2 rounded-xl">{obsDoc}</p>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Agrupamento Automático */}
      {gruposPreview.length > 0 && (
        <div className="bg-card rounded-2xl card-shadow p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Agrupamento Automático ({gruposPreview.length} grupos)
            </h3>
            <span className="text-xs text-muted-foreground font-semibold tabular-nums">
              {itens.length} registros
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {gruposPreview.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between bg-secondary/70 rounded-xl px-3 py-2 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{g.descricao}</p>
                  <p className="text-muted-foreground truncate">
                    {g.categoria}
                    {g.dependencias ? ` · Dep.: ${g.dependencias}` : ""}
                  </p>
                </div>
                <span className="font-bold text-primary shrink-0 tabular-nums">
                  Qtd esperada: {g.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revisão e correção antes da conferência */}
      <div className="bg-card rounded-2xl card-shadow p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-primary">2. Revisar e Corrigir Dados Extraídos</h3>
            <p className="text-xs text-muted-foreground">
              Confira os itens abaixo antes de iniciar a conferência presencial.
            </p>
          </div>
          <button
            type="button"
            onClick={addManualItem}
            className="px-3 py-2 bg-secondary text-foreground rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Item
          </button>
        </div>

        {itens.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Importe o PDF acima ou clique em "+ Item" para incluir bens manualmente.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {itens.map((item, idx) => (
              <div key={idx} className="bg-secondary/60 rounded-xl p-3 space-y-2 border border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.codigo_patrimonial || ""}
                    onChange={(e) => updateItem(idx, { codigo_patrimonial: e.target.value || null })}
                    placeholder="Código patrimonial"
                    className="w-36 px-2.5 py-2 rounded-lg bg-card text-xs border border-border"
                  />
                  <input
                    type="text"
                    value={item.descricao}
                    onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                    placeholder="Descrição do bem *"
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-card text-xs border border-border font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                    aria-label="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.categoria}
                    onChange={(e) => updateItem(idx, { categoria: e.target.value })}
                    placeholder="Categoria"
                    className="px-2.5 py-1.5 rounded-lg bg-card text-xs border border-border"
                  />
                  <input
                    type="text"
                    value={item.localizacao || ""}
                    onChange={(e) => updateItem(idx, { localizacao: e.target.value || null })}
                    placeholder="Localização"
                    className="px-2.5 py-1.5 rounded-lg bg-card text-xs border border-border"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => updateItem(idx, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="Qtd"
                    className="px-2.5 py-1.5 rounded-lg bg-card text-xs border border-border tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={saveItems.isPending || itens.length === 0}
          onClick={handleConfirm}
          className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
        >
          {saveItems.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              SALVANDO ITENS...
            </>
          ) : (
            <>
              INICIAR CONFERÊNCIA ({itens.length} REGISTROS)
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InventoryImportStep;