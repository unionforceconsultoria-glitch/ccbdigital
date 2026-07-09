import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { tiposFormulario } from "@/data/churches";
import { useAddEnvio, useDocumentosAdmin, useIgrejas } from "@/lib/storage";
import { Camera, Upload, FileText, CheckCircle2, Download, ChevronDown, Shield, Loader2, Check, HelpCircle, Share2, Copy } from "lucide-react";
import { ScanLine } from "lucide-react";
import ProtocolStamp from "@/components/ProtocolStamp";
import TutorialModal from "@/components/TutorialModal";
import DocumentScanner from "@/components/DocumentScanner";

// Função para comprimir fotos tiradas de celular antes de enviar
const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
             const newFile = new File([blob], file.name, {
               type: 'image/jpeg',
               lastModified: Date.now(),
             });
             resolve(newFile);
          } else {
             resolve(file);
          }
        }, 'image/jpeg', 0.7); // 70% quality
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.onerror = () => resolve(file); // se falhar, retorna original
    reader.readAsDataURL(file);
  });
};

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

const UserArea: React.FC = () => {
  const navigate = useNavigate();
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() - 1);
  const defaultMonth = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}`;

  const [igrejaId, setIgrejaId] = useState("");
  const [tipoFormulario, setTipoFormulario] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [mesReferencia, setMesReferencia] = useState(defaultMonth);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [envioInfo, setEnvioInfo] = useState<{ igreja: string; mes: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { data: documentosAdmin = [] } = useDocumentosAdmin();
  const { data: igrejas = [] } = useIgrejas();
  const addEnvio = useAddEnvio();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = ""; // permite reabrir o mesmo arquivo
    setError("");

    if (file.type.startsWith("image/")) {
      setIsScanning(true);
      setScanComplete(false);
      try {
        const compressed = await compressImage(file);
        setArquivo(compressed);
      } catch (err) {
        console.error("Erro ao comprimir", err);
        setArquivo(file);
      } finally {
        setIsScanning(false);
        setScanComplete(true);
      }
    } else {
      setArquivo(file);
      setScanComplete(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!igrejaId || !tipoFormulario || !nomeResponsavel.trim() || !arquivo) {
      setError("Preencha todos os campos e anexe um arquivo.");
      return;
    }

    const igreja = igrejas.find((i) => i.id === Number(igrejaId));
    if (!igreja) return;

    try {
      setIsUploading(true);
      const envio = await addEnvio.mutateAsync({
        igreja_id: igreja.id,
        igreja_nome: igreja.nome,
        tipo_formulario: tipoFormulario,
        nome_responsavel: nomeResponsavel.trim(),
        arquivo_nome: arquivo.name,
        arquivo_url: '',
        mes_referencia: mesReferencia,
        file: arquivo,
      });

      setProtocolo(envio.protocolo);
      setEnvioInfo({ igreja: igreja.nome, mes: mesReferencia });
    } catch (err) {
      console.error(err);
      setError("Erro ao enviar documento. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setIgrejaId("");
    setTipoFormulario("");
    setNomeResponsavel("");
    setMesReferencia(defaultMonth);
    setArquivo(null);
    setProtocolo(null);
    setEnvioInfo(null);
    setCopiado(false);
    setError("");
    setIsScanning(false);
    setScanComplete(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <TutorialModal forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      {showScanner && (
        <DocumentScanner
          onCancel={() => setShowScanner(false)}
          onDone={(file) => {
            setShowScanner(false);
            setArquivo(file);
            setScanComplete(true);
            setIsScanning(false);
            setError("");
          }}
        />
      )}
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-primary-foreground font-bold text-lg tracking-tight">
            Patrimônio CCB Digital
          </h1>
          <p className="text-primary-foreground/70 text-sm">Envio de Documentos · v1.4</p>
        </div>
        <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowTutorial(true)}
          className="text-primary-foreground/70 hover:text-primary-foreground p-2"
          title="Ver tutorial"
        >
          <HelpCircle className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/admin/login")}
          className="text-primary-foreground/70 hover:text-primary-foreground p-2 flex items-center gap-1 text-xs font-medium"
          title="Acesso Administrativo"
        >
          <Shield className="w-5 h-5" />
        </motion.button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {protocolo ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card rounded-2xl card-shadow p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <CheckCircle2 className="w-20 h-20 text-success mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Documento enviado com sucesso!
              </h2>
              <p className="text-muted-foreground mb-6">
                Guarde seu protocolo para referência.
              </p>

              <ProtocolStamp protocolo={protocolo} />

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={resetForm}
                className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-base mt-6 transition-all hover:brightness-110"
              >
                ENVIAR OUTRO DOCUMENTO
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl card-shadow p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-primary">Enviar Documento</h2>
              <p className="text-muted-foreground text-sm">
                Selecione sua igreja e anexe o formulário mensal.
              </p>

              {/* Igreja */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Igreja
                </label>
                <div className="relative">
                  <select
                    value={igrejaId}
                    onChange={(e) => setIgrejaId(e.target.value)}
                    className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base appearance-none cursor-pointer transition-colors"
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

              {/* Mês de Referência */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Mês de Referência
                </label>
                <input
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base transition-colors"
                />
              </div>

              {/* Tipo de Formulário */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tipo de Formulário
                </label>
                <div className="relative">
                  <select
                    value={tipoFormulario}
                    onChange={(e) => setTipoFormulario(e.target.value)}
                    className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base appearance-none cursor-pointer transition-colors"
                  >
                    <option value="">Selecione o formulário</option>
                    {tiposFormulario.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Nome do Responsável */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder="Digite o nome completo"
                  className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base transition-colors"
                />
              </div>

              {/* Upload */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Arquivo (PDF ou Imagem)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setError("");
                      cameraRef.current?.click();
                    }}
                    className="touch-target bg-primary text-primary-foreground rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold hover:brightness-110 transition-all px-1"
                  >
                    <Camera className="w-5 h-5" />
                    Foto
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setError("");
                      setShowScanner(true);
                    }}
                    className="touch-target bg-foreground text-background rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold hover:brightness-110 transition-all px-1"
                  >
                    <ScanLine className="w-5 h-5" />
                    Escanear
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setError("");
                      galleryRef.current?.click();
                    }}
                    className="touch-target bg-secondary text-foreground rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold hover:brightness-95 transition-all border border-border px-1"
                  >
                    <Upload className="w-5 h-5" />
                    Arquivo
                  </motion.button>
                </div>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {arquivo && (
                  <div className="mt-2 relative overflow-hidden rounded-lg">
                    {arquivo.type.startsWith("image/") && (
                      <div className="mx-auto bg-secondary rounded-lg overflow-hidden mb-2" style={{ aspectRatio: "210 / 297", maxWidth: "240px" }}>
                        <img
                          src={URL.createObjectURL(arquivo)}
                          alt="Pré-visualização"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className={`flex items-center gap-2 text-sm text-foreground px-3 py-2 ${scanComplete ? 'bg-green-50 dark:bg-green-950/30' : 'bg-secondary'} transition-colors duration-300`}>
                      {isScanning ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : scanComplete ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                      <span className="truncate">{arquivo.name}</span>
                      {scanComplete && (
                        <span className="ml-auto text-xs font-semibold text-green-600 whitespace-nowrap">
                          Carregado ✓
                        </span>
                      )}
                    </div>
                    {/* Scanning bar animation */}
                    {isScanning && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      >
                        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                disabled={isUploading}
                className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-lg flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-70"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ENVIANDO...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    ENVIAR DOCUMENTO
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Baixar Formulários */}
        <div className="bg-card rounded-2xl card-shadow p-6 mt-4">
            <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Baixar Formulários
            </h2>
            <p className="text-muted-foreground text-sm mb-3">
              Selecione a categoria para filtrar os documentos disponíveis.
            </p>

            {/* Filtro por categoria */}
            {(() => {
              const categorias = [...new Set(documentosAdmin.map((d) => d.categoria).filter(Boolean))];
              return categorias.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setCategoriaFiltro("")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      categoriaFiltro === ""
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-muted"
                    }`}
                  >
                    Todos
                  </button>
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaFiltro(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        categoriaFiltro === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-muted"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}

            <div className="space-y-2">
              {documentosAdmin.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum formulário disponível no momento.</p>
              )}
              {documentosAdmin
                .filter((doc) => !categoriaFiltro || doc.categoria === categoriaFiltro)
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary/70 border-l-4 border-l-primary rounded-xl p-4 gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-bold text-foreground break-words leading-tight block">
                          {doc.nome}
                        </span>
                        {doc.categoria && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-background rounded text-xs font-medium text-muted-foreground">
                            {doc.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(doc.arquivo_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = doc.nome || "documento";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch {
                          window.open(doc.arquivo_url, "_blank");
                        }
                      }}
                      className="w-full sm:w-auto touch-target bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-all"
                    >
                      <Download className="w-5 h-5" />
                      BAIXAR DOCUMENTO
                    </button>
                  </div>
                ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default UserArea;
