import React, { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  FileDown,
  FolderCheck,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  type BemExtra,
  type InventarioItem,
  type InventarioRecord,
  classificarResultados,
  ETIQUETA_LABELS,
} from "@/lib/inventoryUtils";
import { useAddBemExtra, useRemoveBemExtra, useConcluirInventario } from "@/lib/inventoryStorage";
import { gerarRelatorioIndividualPdf } from "@/lib/inventoryPdf";

interface InventoryExtrasAndSummaryProps {
  inventario: InventarioRecord;
  itens: InventarioItem[];
  bensExtras: BemExtra[];
  onBackToCheck: () => void;
}

const InventoryExtrasAndSummary: React.FC<InventoryExtrasAndSummaryProps> = ({
  inventario,
  itens,
  bensExtras,
  onBackToCheck,
}) => {
  const [temExtras, setTemExtras] = useState<boolean | null>(bensExtras.length > 0 ? true : null);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [codigo, setCodigo] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivarDocs, setArquivarDocs] = useState(true);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const addExtra = useAddBemExtra();
  const removeExtra = useRemoveBemExtra();
  const concluir = useConcluirInventario();

  const cl = classificarResultados(itens, bensExtras);

  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    if (!descricao.trim()) {
      setErrMsg("Informe a descrição do bem extra.");
      return;
    }
    try {
      await addExtra.mutateAsync({
        inventarioId: inventario.id,
        descricao,
        quantidade: Math.max(1, Number(quantidade) || 1),
        codigo_patrimonial: codigo,
        localizacao,
        observacoes,
        autor: inventario.responsavel,
      });
      setDescricao("");
      setQuantidade("1");
      setCodigo("");
      setLocalizacao("");
      setObservacoes("");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro ao adicionar bem extra.");
    }
  };

  const handleFinalizar = async () => {
    setErrMsg("");
    setMsg("");
    try {
      const { blob, download } = gerarRelatorioIndividualPdf(inventario, itens, bensExtras);
      const res = await concluir.mutateAsync({
        inventario,
        relatorioBlob: blob,
        arquivarEmDocumentos: arquivarDocs,
      });
      download();
      setMsg(
        res.arquivado
          ? "Inventário finalizado, PDF baixado e arquivado automaticamente na área Documentos da igreja."
          : "Inventário finalizado e relatório em PDF baixado com sucesso.",
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro ao finalizar o inventário.");
    }
  };

  const handleDownloadPdf = () => {
    const { download } = gerarRelatorioIndividualPdf(inventario, itens, bensExtras);
    download();
  };

  return (
    <div className="space-y-4">
      {/* Pergunta obrigatória sobre bens extras */}
      <div className="bg-card rounded-2xl card-shadow p-5 space-y-3">
        <h3 className="text-base font-bold text-primary">Bens Extras / Não Cadastrados</h3>
        <p className="text-sm font-medium text-foreground">
          Existem bens encontrados na igreja que não constam no inventário original?
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemExtras(true)}
            className={`touch-target rounded-xl font-bold text-sm transition-all ${
              temExtras === true
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground border border-border"
            }`}
          >
            SIM, ADICIONAR
          </button>
          <button
            type="button"
            onClick={() => setTemExtras(false)}
            className={`touch-target rounded-xl font-bold text-sm transition-all ${
              temExtras === false
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground border border-border"
            }`}
          >
            NÃO HÁ EXTRAS
          </button>
        </div>

        {temExtras && (
          <form onSubmit={handleAddExtra} className="space-y-2.5 pt-2 border-t border-border">
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do bem *"
              className="w-full h-11 px-3 rounded-xl bg-secondary text-sm border border-border"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Quantidade"
                className="h-11 px-3 rounded-xl bg-secondary text-sm border border-border tabular-nums"
              />
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código (se houver)"
                className="h-11 px-3 rounded-xl bg-secondary text-sm border border-border"
              />
            </div>
            <input
              type="text"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Localização (ex.: Salão, Cozinha)"
              className="w-full h-11 px-3 rounded-xl bg-secondary text-sm border border-border"
            />
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações"
              className="w-full h-11 px-3 rounded-xl bg-secondary text-sm border border-border"
            />
            <button
              type="submit"
              disabled={addExtra.isPending}
              className="w-full h-11 bg-foreground text-background font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ADICIONAR BEM EXTRA
            </button>
          </form>
        )}

        {bensExtras.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-muted-foreground">Bens extras registrados ({bensExtras.length}):</p>
            {bensExtras.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-secondary/70 rounded-xl px-3 py-2 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-foreground">
                    {b.descricao} (Qtd: {b.quantidade})
                  </p>
                  <p className="text-muted-foreground">
                    {b.codigo_patrimonial ? `Cód: ${b.codigo_patrimonial} · ` : ""}
                    {b.localizacao || "Sem localização"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra.mutate({ id: b.id, inventarioId: inventario.id })}
                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                  aria-label="Remover bem extra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classificação dos 6 resultados */}
      <div className="bg-card rounded-2xl card-shadow p-5 space-y-3">
        <h3 className="text-base font-bold text-primary">Classificação dos Resultados</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-success tabular-nums">{cl.encontrados.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">1. Encontrados</p>
          </div>
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-destructive tabular-nums">{cl.naoEncontrados.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">2. Não encontrados</p>
          </div>
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{cl.divergencias.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">3. Divergências</p>
          </div>
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{cl.semEtiqueta.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">4. Sem etiqueta</p>
          </div>
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{cl.etiquetasDanificadasOuIlegiveis.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">5. Etiq. danificadas</p>
          </div>
          <div className="bg-secondary/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary tabular-nums">{cl.bensExtras.length}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">6. Bens extras</p>
          </div>
        </div>

        {cl.etiquetasDanificadasOuIlegiveis.length > 0 && (
          <div className="text-xs bg-secondary/50 rounded-xl p-3 space-y-1">
            <p className="font-bold text-foreground">Etiquetas com pendência:</p>
            {cl.etiquetasDanificadasOuIlegiveis.slice(0, 5).map((i) => (
              <p key={i.id} className="text-muted-foreground">
                • {i.codigo_patrimonial || "—"} {i.descricao} ({ETIQUETA_LABELS[i.status_etiqueta]})
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Finalização e Arquivamento em Documentos */}
      <div className="bg-card rounded-2xl card-shadow p-5 space-y-3">
        <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={arquivarDocs}
            onChange={(e) => setArquivarDocs(e.target.checked)}
            disabled={inventario.arquivado_documentos}
            className="mt-0.5 rounded"
          />
          <span>
            Arquivar automaticamente o relatório final na área <strong>Documentos</strong> da igreja ({inventario.igreja_nome}).
          </span>
        </label>

        {inventario.arquivado_documentos && (
          <div className="flex items-center gap-2 text-xs text-success bg-success/10 px-3 py-2 rounded-xl font-medium">
            <FolderCheck className="w-4 h-4 shrink-0" />
            Relatório já arquivado na área Documentos desta igreja.
          </div>
        )}

        {errMsg && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errMsg}</span>
          </div>
        )}

        {msg && (
          <div className="flex items-start gap-2 text-xs text-success bg-success/10 px-3 py-2 rounded-xl font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{msg}</span>
          </div>
        )}

        <button
          type="button"
          disabled={concluir.isPending}
          onClick={handleFinalizar}
          className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
        >
          {concluir.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              FINALIZANDO E GERANDO PDF...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              {inventario.status === "concluido" ? "ATUALIZAR E BAIXAR RELATÓRIO FINAL" : "FINALIZAR INVENTÁRIO E GERAR PDF"}
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onBackToCheck}
            className="h-11 bg-secondary text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            VOLTAR À CONFERÊNCIA
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="h-11 bg-secondary text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-border"
          >
            <FileDown className="w-4 h-4" />
            BAIXAR PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryExtrasAndSummary;