import { downloadAsPdf } from "@/lib/downloadAsPdf";
import React, { useState } from "react";
import { tiposFormulario } from "@/data/churches";
import { useEnvios, useIgrejas } from "@/lib/storage";
import {
  Download,
  Printer,
  FileText,
  Search,
  Archive,
  CheckSquare,
  Square,
  Loader2,
  FileCheck,
  Sparkles,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  printUnifiedA4,
  downloadUnifiedA4,
  EnvioDocumento,
} from "@/lib/pdfPrintService";

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

const AdminPrinting: React.FC = () => {
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() - 1);
  const defaultMonth = `${defaultDate.getFullYear()}-${String(
    defaultDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const [mesFiltro, setMesFiltro] = useState(defaultMonth);
  const [igrejaFiltro, setIgrejaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const { data: igrejas = [] } = useIgrejas();
  const [isZipping, setIsZipping] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: envios = [] } = useEnvios();
  const mesRef = mesFiltro;

  const filtered = envios.filter((e) => {
    if (e.mes_referencia !== mesRef) return false;
    if (igrejaFiltro && e.igreja_id !== Number(igrejaFiltro)) return false;
    if (tipoFiltro && e.tipo_formulario !== tipoFiltro) return false;
    return true;
  });

  const allSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const selectedEnvios = filtered.filter((e) => selectedIds.has(e.id));
  const targetEnvios = selectedEnvios.length > 0 ? selectedEnvios : filtered;

  // Converte envios para o formato esperado pelo serviço
  const mapToDocumentos = (lista: typeof filtered): EnvioDocumento[] => {
    return lista.map((e) => ({
      id: e.id,
      arquivo_nome: e.arquivo_nome,
      arquivo_url: e.arquivo_url,
      igreja_nome: e.igreja_nome,
      tipo_formulario: e.tipo_formulario,
      protocolo: e.protocolo,
      mes_referencia: e.mes_referencia,
    }));
  };

  // Imprime em formato A4 padronizado (mesclando PDFs e fotos digitalizadas)
  const handlePrintA4Unified = async () => {
    if (targetEnvios.length === 0) return;
    setIsProcessingPdf(true);
    setPdfProgressMsg("Iniciando digitalização e montagem do PDF A4...");

    try {
      const documentos = mapToDocumentos(targetEnvios);
      await printUnifiedA4(documentos, (_curr, _tot, msg) => {
        setPdfProgressMsg(msg);
      });
      toast.success(
        `${documentos.length} documento(s) padronizado(s) em A4 com sucesso!`
      );
    } catch (err: any) {
      console.error("Erro ao gerar PDF para impressão:", err);
      toast.error(
        "Erro ao processar documentos para impressão: " +
          (err.message || "Tente novamente")
      );
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressMsg("");
    }
  };

  // Baixa o arquivo PDF A4 único consolidado para arquivo/guarda
  const handleDownloadA4Unified = async () => {
    if (targetEnvios.length === 0) return;
    setIsProcessingPdf(true);
    setPdfProgressMsg("Processando páginas em A4 de alta definição...");

    try {
      const documentos = mapToDocumentos(targetEnvios);
      const nomeArquivo = `Documentos_CCB_Digital_${mesFiltro}_A4.pdf`;
      await downloadUnifiedA4(documentos, nomeArquivo, (_curr, _tot, msg) => {
        setPdfProgressMsg(msg);
      });
      toast.success(`PDF A4 baixado com sucesso: ${nomeArquivo}`);
    } catch (err: any) {
      console.error("Erro ao baixar PDF A4 unificado:", err);
      toast.error("Erro ao gerar PDF: " + (err.message || "Tente novamente"));
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressMsg("");
    }
  };

  // Imprime um documento individual em A4
  const handlePrintSingle = async (envio: (typeof filtered)[0]) => {
    setIsProcessingPdf(true);
    setPdfProgressMsg(`Digitalizando ${envio.igreja_nome} em A4...`);

    try {
      const documentos = mapToDocumentos([envio]);
      await printUnifiedA4(documentos);
      toast.success("Documento pronto para impressão A4!");
    } catch (err: any) {
      console.error("Erro ao imprimir documento:", err);
      toast.error("Falha ao abrir impressão: " + (err.message || ""));
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressMsg("");
    }
  };

  // Mantém a opção original de baixar o arquivo ZIP bruto
  const handleDownloadZip = async () => {
    if (targetEnvios.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folderName = `Documentos_${mesFiltro}`;
      const rootFolder = zip.folder(folderName);
      if (!rootFolder) return;

      for (const envio of targetEnvios) {
        try {
          const response = await fetch(envio.arquivo_url);
          const blob = await response.blob();
          const igrejaFolder = rootFolder.folder(envio.igreja_nome);
          igrejaFolder?.file(envio.arquivo_nome, blob);
        } catch (err) {
          console.error("Erro ao baixar arquivo:", envio.arquivo_nome, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
      toast.success("Arquivo ZIP gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar zip:", err);
      toast.error("Erro ao criar pacote ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Informativo de Digitalização A4 */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-primary">
              Impressão Padronizada A4 (Estilo Scanner)
            </h4>
            <p className="text-xs text-muted-foreground">
              Fotos e PDFs são convertidos automaticamente para páginas A4
              nítidas, com fundo limpo e sem cortes nas bordas.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-background rounded-2xl card-shadow p-4 space-y-3">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <Search className="w-5 h-5" />
          Filtros de Documentos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm"
          />
          <select
            value={igrejaFiltro}
            onChange={(e) => setIgrejaFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todas as igrejas</option>
            {igrejas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
          >
            <option value="">Todos os formulários</option>
            {tiposFormulario.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de Progresso quando está gerando o PDF */}
      {isProcessingPdf && (
        <div className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 shadow-lg animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Gerando PDF A4 Unificado...</p>
            <p className="text-xs opacity-90 truncate">{pdfProgressMsg}</p>
          </div>
        </div>
      )}

      {/* Resultados e Ações */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {filtered.length > 0 && (
              <button
                onClick={toggleSelectAll}
                disabled={isProcessingPdf}
                className="text-sm font-semibold text-primary flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
                {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
              </button>
            )}
            <h3 className="font-bold text-foreground text-sm">
              {selectedEnvios.length > 0
                ? `${selectedEnvios.length} selecionado${
                    selectedEnvios.length !== 1 ? "s" : ""
                  }`
                : `${filtered.length} documento${
                    filtered.length !== 1 ? "s" : ""
                  }`}
            </h3>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Principal: Imprimir PDF A4 Unificado */}
              <button
                onClick={handlePrintA4Unified}
                disabled={isProcessingPdf || isZipping}
                title="Abre todos os documentos padronizados em folha A4 oficial para imprimir"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {isProcessingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir PDF A4
              </button>

              {/* Botão Secundário: Baixar PDF A4 Unificado */}
              <button
                onClick={handleDownloadA4Unified}
                disabled={isProcessingPdf || isZipping}
                title="Baixa um arquivo PDF único com todas as páginas em A4 para arquivar"
                className="bg-secondary text-foreground hover:bg-muted border border-border px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4 text-primary" />
                Baixar PDF A4
              </button>

              {/* Botão Terciário: Baixar ZIP */}
              <button
                onClick={handleDownloadZip}
                disabled={isZipping || isProcessingPdf}
                title="Baixa os arquivos originais em uma pasta ZIP"
                className="bg-secondary text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {isZipping ? "Gerando..." : "ZIP"}
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum documento encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((envio) => {
              const isSelected = selectedIds.has(envio.id);
              const isImage = /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(
                envio.arquivo_nome
              );

              return (
                <div
                  key={envio.id}
                  onClick={() => toggleSelect(envio.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <button className="shrink-0 text-primary" tabIndex={-1}>
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold truncate text-foreground">
                        {envio.igreja_nome}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                          isImage
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {isImage ? "Foto / Digitalizado" : "PDF"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {envio.tipo_formulario} · Protocolo:{" "}
                      <span className="font-mono">{envio.protocolo}</span>
                    </p>
                  </div>

                  {/* Ações por linha */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintSingle(envio);
                      }}
                      title="Imprimir este documento em A4"
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <a
                      href={envio.arquivo_url}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadAsPdf(envio.arquivo_url, envio.arquivo_nome).catch(() => window.open(envio.arquivo_url, "_blank"));
                      }}
                      title="Baixar em PDF"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
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

export default AdminPrinting;
