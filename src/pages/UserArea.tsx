import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { igrejas, tiposFormulario } from "@/data/churches";
import { useAddEnvio, useDocumentosAdmin } from "@/lib/storage";
import { Camera, Upload, FileText, CheckCircle2, Download, ChevronDown, Shield, Loader2, Check } from "lucide-react";
import ProtocolStamp from "@/components/ProtocolStamp";

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
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { data: documentosAdmin = [] } = useDocumentosAdmin();
  const addEnvio = useAddEnvio();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivo(file);
      setScanComplete(false);
      setIsScanning(true);
      // Simulate scanning animation
      setTimeout(() => {
        setIsScanning(false);
        setScanComplete(true);
      }, 1500);
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
    setError("");
    setIsScanning(false);
    setScanComplete(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-primary-foreground font-bold text-lg tracking-tight">
            Patrimônio CCB Digital
          </h1>
          <p className="text-primary-foreground/70 text-sm">Envio de Documentos</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/admin/login")}
          className="text-primary-foreground/70 hover:text-primary-foreground p-2 flex items-center gap-1 text-xs font-medium"
          title="Acesso Administrativo"
        >
          <Shield className="w-5 h-5" />
        </motion.button>
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
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => cameraRef.current?.click()}
                    className="flex-1 touch-target bg-secondary rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Câmera
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 touch-target bg-secondary rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {arquivo && (
                  <div className="mt-2 relative overflow-hidden rounded-lg">
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
                    className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{doc.nome}</span>
                        {doc.categoria && (
                          <span className="text-xs text-muted-foreground">{doc.categoria}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.arquivo_url}
                      download={doc.nome}
                      className="text-primary hover:text-primary/80 shrink-0"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default UserArea;
