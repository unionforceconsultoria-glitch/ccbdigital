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
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError("");
    if (!nome.trim() || !arquivo) {
      setError("Preencha o nome e selecione um arquivo.");
      return;
    }
    
    try {
      await addDoc.mutateAsync({
        nome: nome.trim(),
        categoria: categoria || "Outro",
        arquivo_url: '',
        file: arquivo,
      });
      setNome("");
      setCategoria("");
      setArquivo(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar arquivo. Ele pode ser grande demais.");
    }
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
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do documento"
          className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base transition-colors"
        />
        <div className="relative">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base appearance-none cursor-pointer transition-colors"
          >
            <option value="">Categoria (opcional)</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => fileRef.current?.click()}
          className="w-full touch-target bg-secondary rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Upload className="w-5 h-5" />
          {arquivo ? arquivo.name : "Selecionar PDF"}
        </motion.button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setArquivo(file);
              setNome(file.name.replace(/\.[^/.]+$/, ""));
            }
          }}
          className="hidden"
        />
        {error && <p className="text-destructive text-sm font-medium">{error}</p>}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleUpload}
          className="w-full touch-target bg-accent text-accent-foreground font-bold rounded-xl text-base transition-all hover:brightness-105"
        >
          DISPONIBILIZAR
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
