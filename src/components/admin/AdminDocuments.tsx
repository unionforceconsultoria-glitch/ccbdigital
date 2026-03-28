import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  useAddDocumentoAdmin,
  useDocumentosAdmin,
  useRemoveDocumentoAdmin,
} from "@/lib/storage";

import { Upload, FileText, Trash2, FolderUp, ChevronDown } from "lucide-react";

const categorias = [
  "Formulário Mensal",
  "Relatório",
  "Modelo / Template",
  "Circular",
  "Outro",
];

const AdminDocuments: React.FC = () => {
  const { data: docs = [] } = useDocumentosAdmin();
  const addDoc = useAddDocumentoAdmin();
  const removeDoc = useRemoveDocumentoAdmin();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError("");
    if (arquivos.length === 0) {
      setError("Selecione ao menos um arquivo.");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress({ current: 0, total: arquivos.length });

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const file = arquivos[i];
        setUploadProgress({ current: i + 1, total: arquivos.length });
        
        await addDoc.mutateAsync({
          nome: file.name.replace(/\.[^/.]+$/, ""),
          categoria: categoria || "Outro",
          arquivo_url: '',
          file: file,
        });
      }
      
      setArquivos([]);
      setCategoria("");
      setNome("");
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar um ou mais arquivos. Verifique a conexão.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setArquivos(prev => [...prev, ...selectedFiles]);
      // Clear input value so same file can be selected again if removed
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFileFromList = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemove = (id: string) => {
    removeDoc.mutate(id);
  };

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="bg-background rounded-2xl card-shadow p-4 space-y-3">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <FolderUp className="w-5 h-5" />
          Enviar Documento para Download
        </h3>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Arquivos Selecionados ({arquivos.length})
          </label>
          <div className="flex gap-2">
             <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => fileRef.current?.click()}
              className="flex-1 touch-target bg-secondary rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors border-2 border-dashed border-primary/20"
            >
              <Upload className="w-5 h-5 text-primary" />
              Adicionar PDFs / Imagens
            </motion.button>
          </div>
          
          {arquivos.length > 0 && (
            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {arquivos.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-medium truncate">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFileFromList(idx)}
                    className="text-destructive p-1 hover:bg-destructive/10 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        {error && <p className="text-destructive text-sm font-medium">{error}</p>}
        
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleUpload}
          disabled={arquivos.length === 0 || isUploading}
          className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-base transition-all hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Upload className="w-5 h-5" />
              </motion.div>
              ENVIANDO ({uploadProgress.current}/{uploadProgress.total})...
            </>
          ) : (
            <>
              <FolderUp className="w-5 h-5" />
              DISPONIBILIZAR {arquivos.length > 0 ? `(${arquivos.length} ARQUIVOS)` : ""}
            </>
          )}
        </motion.button>
      </div>

      {/* Document list */}
      <div className="bg-background rounded-2xl card-shadow p-4">
        <h3 className="font-bold text-primary mb-3">Documentos Disponíveis</h3>
        {docs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum documento disponibilizado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.data_upload).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(doc.id)}
                  className="text-destructive hover:text-destructive/80 shrink-0 ml-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDocuments;
