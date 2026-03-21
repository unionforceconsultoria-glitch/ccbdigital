import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

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

// Hooks para Envios
export const useEnvios = () => {
  return useQuery({
    queryKey: ["envios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ccb_envios")
        .select("*")
        .order("data_envio", { ascending: false });
      if (error) throw error;
      return data as Envio[];
    },
  });
};

export const useAddEnvio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (envio: Omit<Envio, "id" | "protocolo" | "data_envio"> & { mes_referencia?: string }) => {
      const protocolo = gerarProtocolo();
      const mes_referencia = envio.mes_referencia || getMesReferencia();
      const payload = { ...envio, protocolo, mes_referencia };
      const { data, error } = await supabase.from("ccb_envios").insert([payload]).select().single();
      if (error) throw error;
      return data as Envio;
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
      const { error } = await supabase.from("ccb_envios").delete().eq("id", id);
      if (error) throw error;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ccb_documentos")
        .select("*")
        .order("data_upload", { ascending: false });
      if (error) throw error;
      return data as DocumentoAdmin[];
    },
  });
};

export const useAddDocumentoAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Omit<DocumentoAdmin, "id" | "data_upload">) => {
      const { data, error } = await supabase.from("ccb_documentos").insert([doc]).select().single();
      if (error) throw error;
      return data as DocumentoAdmin;
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
      const { error } = await supabase.from("ccb_documentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
  });
};
