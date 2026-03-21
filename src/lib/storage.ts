import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Envio {
  id: string;
  igreja_id: number;
  igreja_nome: string;
  tipo_formulario: string;
  nome_responsavel: string;
  arquivo_nome: string;
  arquivo_url: string;
  data_envio: string;
  mes_referencia: string;
  protocolo: string;
}

export interface DocumentoAdmin {
  id: string;
  nome: string;
  categoria: string;
  arquivo_url: string;
  data_upload: string;
}

export function gerarProtocolo(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 10000);
  return `CCB-${year}-${String(num).padStart(4, "0")}`;
}

export function getMesReferencia(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getStoredEnvios(): Envio[] {
  try {
    return JSON.parse(localStorage.getItem("ccb_envios") || "[]");
  } catch { return []; }
}

function setStoredEnvios(envios: Envio[]) {
  localStorage.setItem("ccb_envios", JSON.stringify(envios));
}

function getStoredDocumentos(): DocumentoAdmin[] {
  try {
    return JSON.parse(localStorage.getItem("ccb_documentos") || "[]");
  } catch { return []; }
}

function setStoredDocumentos(docs: DocumentoAdmin[]) {
  localStorage.setItem("ccb_documentos", JSON.stringify(docs));
}

// Hooks para Envios
export const useEnvios = () => {
  return useQuery({
    queryKey: ["envios"],
    queryFn: async () => getStoredEnvios(),
  });
};

export const useAddEnvio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (envio: Omit<Envio, "id" | "protocolo" | "data_envio">) => {
      const protocolo = gerarProtocolo();
      const newEnvio: Envio = {
        ...envio,
        id: crypto.randomUUID(),
        protocolo,
        data_envio: new Date().toISOString(),
        mes_referencia: envio.mes_referencia || getMesReferencia(),
      };
      const envios = getStoredEnvios();
      envios.unshift(newEnvio);
      setStoredEnvios(envios);
      return newEnvio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envios"] });
    },
  });
};

export const useRemoveEnvio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const envios = getStoredEnvios().filter(e => e.id !== id);
      setStoredEnvios(envios);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envios"] });
    },
  });
};

// Hooks para Documentos Admin
export const useDocumentosAdmin = () => {
  return useQuery({
    queryKey: ["documentos"],
    queryFn: async () => getStoredDocumentos(),
  });
};

export const useAddDocumentoAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Omit<DocumentoAdmin, "id" | "data_upload">) => {
      const newDoc: DocumentoAdmin = {
        ...doc,
        id: crypto.randomUUID(),
        data_upload: new Date().toISOString(),
      };
      const docs = getStoredDocumentos();
      docs.unshift(newDoc);
      setStoredDocumentos(docs);
      return newDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
  });
};

export const useRemoveDocumentoAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const docs = getStoredDocumentos().filter(d => d.id !== id);
      setStoredDocumentos(docs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
  });
};
