import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  adicionarDocumentoAdmin,
  getDocumentosAdmin,
  removerDocumentoAdmin,
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
  const [docs, setDocs] = useState(getDocumentosAdmin());
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    setError("");
    if (!nome.trim() || !arquivo) {
      setError("Preencha o nome e selecione um arquivo.");
      return;
    }
    adicionarDocumentoAdmin({
      nome: nome.trim(),
      arquivo_url: URL.createObjectURL(arquivo),
    });
    setDocs(getDocumentosAdmin());
    setNome("");
    setArquivo(null);
  };

  const handleRemove = (id: string) => {
    removerDocumentoAdmin(id);
    setDocs(getDocumentosAdmin());
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
          onChange={(e) => e.target.files?.[0] && setArquivo(e.target.files[0])}
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
