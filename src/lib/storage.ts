import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

async function uploadFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
  
  const { error } = await supabase.storage
    .from('documentos')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('documentos')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
}

// Hooks para Envios
export const useEnvios = () => {
  return useQuery({
    queryKey: ["envios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios')
        .select('*')
        .order('data_envio', { ascending: false });
      if (error) throw error;
      return (data || []) as Envio[];
    },
  });
};

export const useAddEnvio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (envio: Omit<Envio, "id" | "protocolo" | "data_envio"> & { file?: File }) => {
      let arquivo_url = envio.arquivo_url;
      
      // Upload file to storage if provided
      if (envio.file) {
        arquivo_url = await uploadFile(envio.file, 'envios');
      }
      
      const protocolo = gerarProtocolo();
      const { data, error } = await supabase
        .from('envios')
        .insert({
          igreja_id: envio.igreja_id,
          igreja_nome: envio.igreja_nome,
          tipo_formulario: envio.tipo_formulario,
          nome_responsavel: envio.nome_responsavel,
          arquivo_nome: envio.arquivo_nome,
          arquivo_url,
          mes_referencia: envio.mes_referencia || getMesReferencia(),
          protocolo,
        })
        .select()
        .single();
      
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
      const { error } = await supabase
        .from('envios')
        .delete()
        .eq('id', id);
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
        .from('documentos_admin')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data || []) as DocumentoAdmin[];
    },
  });
};

export const useAddDocumentoAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Omit<DocumentoAdmin, "id" | "data_upload"> & { file?: File }) => {
      let arquivo_url = doc.arquivo_url;
      
      if (doc.file) {
        arquivo_url = await uploadFile(doc.file, 'admin');
      }
      
      const { data, error } = await supabase
        .from('documentos_admin')
        .insert({
          nome: doc.nome,
          categoria: doc.categoria || 'Outro',
          arquivo_url,
        })
        .select()
        .single();
      
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
      const { error } = await supabase
        .from('documentos_admin')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
  });
};
