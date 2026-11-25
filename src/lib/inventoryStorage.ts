import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { gerarProtocolo } from "@/lib/storage";
import {
  type InventarioRecord,
  type InventarioItem,
  type BemExtra,
  type ExtractedInventoryItem,
  type StatusConferencia,
  type StatusEtiqueta,
  type MetodoConferencia,
  type TipoProcedimento,
  normalizarChaveGrupo,
  calcularResumoInventario,
} from "@/lib/inventoryUtils";

function safeId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadInventoryPdf(file: File | Blob, folder: "originais" | "relatorios", fileNameHint: string): Promise<string> {
  const cleanHint = fileNameHint.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "inventario.pdf";
  const path = `inventarios/${folder}/${safeId()}-${cleanHint.endsWith(".pdf") ? cleanHint : `${cleanHint}.pdf`}`;

  const { error } = await supabase.storage.from("documentos").upload(path, file, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("documentos").getPublicUrl(path);
  return data.publicUrl;
}

export async function registrarHistorico(
  inventarioId: string,
  acao: string,
  detalhes: string,
  autor?: string,
): Promise<void> {
  await supabase.from("inventario_historico_alteracoes").insert({
    inventario_id: inventarioId,
    acao,
    detalhes,
    autor: autor || null,
  });
}

export async function extrairItensDoPdf(params: {
  fileUrl?: string;
  fileBase64?: string;
  filename: string;
}): Promise<{ itens: ExtractedInventoryItem[]; observacoes_documento: string | null }> {
  const { data, error } = await supabase.functions.invoke("parse-inventory-pdf", {
    body: params,
  });
  if (error) {
    throw new Error(error.message || "Não foi possível interpretar o PDF.");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return {
    itens: Array.isArray(data?.itens) ? data.itens : [],
    observacoes_documento: data?.observacoes_documento ?? null,
  };
}

export const useInventarios = (igrejaId?: number) => {
  return useQuery({
    queryKey: ["inventarios", igrejaId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("inventarios")
        .select("*")
        .order("data_inventario", { ascending: false })
        .order("created_at", { ascending: false });
      if (igrejaId !== undefined) {
        query = query.eq("igreja_id", igrejaId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as InventarioRecord[];
    },
  });
};

export const useInventarioDetalhe = (inventarioId: string | null) => {
  return useQuery({
    queryKey: ["inventario_detalhe", inventarioId],
    enabled: Boolean(inventarioId),
    queryFn: async () => {
      const [invRes, itensRes, extrasRes] = await Promise.all([
        supabase.from("inventarios").select("*").eq("id", inventarioId!).single(),
        supabase
          .from("inventario_itens")
          .select("*")
          .eq("inventario_id", inventarioId!)
          .order("descricao", { ascending: true }),
        supabase
          .from("inventario_bens_extras")
          .select("*")
          .eq("inventario_id", inventarioId!)
          .order("created_at", { ascending: false }),
      ]);
      if (invRes.error) throw invRes.error;
      if (itensRes.error) throw itensRes.error;
      if (extrasRes.error) throw extrasRes.error;
      return {
        inventario: invRes.data as unknown as InventarioRecord,
        itens: (itensRes.data || []) as unknown as InventarioItem[],
        bensExtras: (extrasRes.data || []) as unknown as BemExtra[],
      };
    },
  });
};

export const useAllInventarioItens = () => {
  return useQuery({
    queryKey: ["inventario_itens_all"],
    queryFn: async () => {
      const [itensRes, extrasRes] = await Promise.all([
        supabase.from("inventario_itens").select("*"),
        supabase.from("inventario_bens_extras").select("*"),
      ]);
      if (itensRes.error) throw itensRes.error;
      if (extrasRes.error) throw extrasRes.error;
      return {
        itens: (itensRes.data || []) as unknown as InventarioItem[],
        bensExtras: (extrasRes.data || []) as unknown as BemExtra[],
      };
    },
  });
};

export const useCreateInventario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      igreja_id: number;
      igreja_nome: string;
      responsavel: string;
      tipo_procedimento: TipoProcedimento;
      data_inventario?: string;
    }) => {
      const { data, error } = await supabase
        .from("inventarios")
        .insert({
          igreja_id: input.igreja_id,
          igreja_nome: input.igreja_nome,
          responsavel: input.responsavel.trim(),
          tipo_procedimento: input.tipo_procedimento,
          data_inventario: input.data_inventario || new Date().toISOString().slice(0, 10),
          status: "em_andamento",
        })
        .select()
        .single();
      if (error) throw error;
      await registrarHistorico(
        data.id,
        "criado",
        `Inventário ${input.tipo_procedimento} iniciado para ${input.igreja_nome}.`,
        input.responsavel.trim(),
      );
      return data as unknown as InventarioRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventarios"] });
    },
  });
};

export const useUpdateInventario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      igreja_id: number;
      igreja_nome: string;
      responsavel: string;
      data_inventario: string;
      status?: "em_andamento" | "concluido";
    }) => {
      const patch: Record<string, unknown> = {
        igreja_id: input.igreja_id,
        igreja_nome: input.igreja_nome,
        responsavel: input.responsavel.trim(),
        data_inventario: input.data_inventario,
      };
      if (input.status) patch.status = input.status;

      const { data, error } = await supabase
        .from("inventarios")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;

      await registrarHistorico(
        input.id,
        "editado",
        `Dados atualizados: ${input.igreja_nome} (${input.data_inventario}) — ${input.responsavel.trim()}.`,
        input.responsavel.trim(),
      );
      return data as unknown as InventarioRecord;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_detalhe", vars.id] });
    },
  });
};

export const useDeleteInventario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inventarioId: string) => {
      const { error } = await supabase.from("inventarios").delete().eq("id", inventarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_detalhe"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

export const useSaveExtractedItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      inventarioId: string;
      responsavel: string;
      pdfUrl: string | null;
      pdfNome: string | null;
      itens: ExtractedInventoryItem[];
    }) => {
      // Remove itens antigos caso esteja reimportando antes da conferência
      const { error: delErr } = await supabase
        .from("inventario_itens")
        .delete()
        .eq("inventario_id", input.inventarioId);
      if (delErr) throw delErr;

      // Garante códigos patrimoniais únicos (evita erro de índice único se o PDF repetir código)
      const seenCodes = new Set<string>();
      const rows = input.itens.map((item) => {
        let code = item.codigo_patrimonial?.trim() || null;
        if (code) {
          const norm = code.toLowerCase();
          if (seenCodes.has(norm)) {
            code = null;
          } else {
            seenCodes.add(norm);
          }
        }
        const categoria = item.categoria?.trim() || "Geral";
        const descricao = item.descricao.trim();
        return {
          inventario_id: input.inventarioId,
          codigo_patrimonial: code,
          descricao,
          categoria,
          localizacao: item.localizacao?.trim() || null,
          grupo_chave: normalizarChaveGrupo(descricao, categoria),
          quantidade_esperada: Math.max(1, Math.round(Number(item.quantidade) || 1)),
          status_conferencia: "pendente" as const,
          status_etiqueta: "presente_legivel" as const,
        };
      });

      if (rows.length > 0) {
        // Inserção em lotes de 200
        for (let i = 0; i < rows.length; i += 200) {
          const batch = rows.slice(i, i + 200);
          const { error: insErr } = await supabase.from("inventario_itens").insert(batch);
          if (insErr) throw insErr;
        }
      }

      const resumo = {
        total_itens: rows.length,
        conferidos: 0,
        pendentes: rows.length,
        encontrados: 0,
        nao_encontrados: 0,
        divergencias: 0,
        sem_etiqueta: 0,
        etiquetas_danificadas: 0,
        bens_extras: 0,
      };

      const { error: updErr } = await supabase
        .from("inventarios")
        .update({
          pdf_original_url: input.pdfUrl,
          pdf_original_nome: input.pdfNome,
          dados_extraidos_json: input.itens as unknown as never,
          resumo_json: resumo as unknown as never,
        })
        .eq("id", input.inventarioId);
      if (updErr) throw updErr;

      await registrarHistorico(
        input.inventarioId,
        "pdf_importado",
        `${rows.length} registros carregados${input.pdfNome ? ` do PDF ${input.pdfNome}` : ""}.`,
        input.responsavel,
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inventario_detalhe", vars.inventarioId] });
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

export async function syncResumoInventario(inventarioId: string): Promise<void> {
  const [itensRes, extrasRes] = await Promise.all([
    supabase.from("inventario_itens").select("*").eq("inventario_id", inventarioId),
    supabase.from("inventario_bens_extras").select("*").eq("inventario_id", inventarioId),
  ]);
  if (itensRes.error || extrasRes.error) return;
  const resumo = calcularResumoInventario(
    (itensRes.data || []) as unknown as InventarioItem[],
    (extrasRes.data || []) as unknown as BemExtra[],
  );
  await supabase
    .from("inventarios")
    .update({ resumo_json: resumo as unknown as never })
    .eq("id", inventarioId);
}

type DetalheCache = {
  inventario: InventarioRecord;
  itens: InventarioItem[];
  bensExtras: BemExtra[];
};

function syncResumoFromCacheInBackground(
  qc: ReturnType<typeof useQueryClient>,
  inventarioId: string,
): void {
  const cached = qc.getQueryData<DetalheCache>(["inventario_detalhe", inventarioId]);
  if (cached) {
    const resumo = calcularResumoInventario(cached.itens, cached.bensExtras);
    void supabase
      .from("inventarios")
      .update({ resumo_json: resumo as unknown as never })
      .eq("id", inventarioId);
  } else {
    void syncResumoInventario(inventarioId);
  }
}

export const useUpdateInventarioItem = () => {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async (input: {
      itemId: string;
      inventarioId: string;
      status_conferencia: StatusConferencia;
      status_etiqueta: StatusEtiqueta;
      quantidade_encontrada: number | null;
      metodo_conferencia: MetodoConferencia;
      observacoes?: string | null;
    }) => {
      const key = ["inventario_detalhe", input.inventarioId];
      const previous = qc.getQueryData<DetalheCache>(key);
      const now = new Date().toISOString();
      if (previous) {
        qc.setQueryData<DetalheCache>(key, {
          ...previous,
          itens: previous.itens.map((it) =>
            it.id === input.itemId
              ? {
                  ...it,
                  status_conferencia: input.status_conferencia,
                  status_etiqueta: input.status_etiqueta,
                  quantidade_encontrada: input.quantidade_encontrada,
                  metodo_conferencia: input.metodo_conferencia,
                  observacoes: input.observacoes ?? it.observacoes,
                  conferido_em: now,
                }
              : it,
          ),
        });
      }
      return { previous, key };
    },
    mutationFn: async (input: {
      itemId: string;
      inventarioId: string;
      status_conferencia: StatusConferencia;
      status_etiqueta: StatusEtiqueta;
      quantidade_encontrada: number | null;
      metodo_conferencia: MetodoConferencia;
      observacoes?: string | null;
    }) => {
      const { error } = await supabase
        .from("inventario_itens")
        .update({
          status_conferencia: input.status_conferencia,
          status_etiqueta: input.status_etiqueta,
          quantidade_encontrada: input.quantidade_encontrada,
          metodo_conferencia: input.metodo_conferencia,
          observacoes: input.observacoes ?? null,
          conferido_em: new Date().toISOString(),
        })
        .eq("id", input.itemId);
      if (error) throw error;
      syncResumoFromCacheInBackground(qc, input.inventarioId);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

function calcularDistribuicaoGrupo(
  itens: InventarioItem[],
  quantidadeEncontradaTotal: number,
): Array<{ id: string; quantidade_encontrada: number; status_conferencia: StatusConferencia }> {
  let restante = Math.max(0, Math.round(quantidadeEncontradaTotal));
  return itens.map((item, i) => {
    const esperado = item.quantidade_esperada || 1;
    const isLast = i === itens.length - 1;
    const alocado = isLast ? restante : Math.min(esperado, restante);
    restante = Math.max(0, restante - alocado);
    const status: StatusConferencia =
      alocado === 0 ? "nao_encontrado" : alocado === esperado ? "encontrado" : "divergencia";
    return { id: item.id, quantidade_encontrada: alocado, status_conferencia: status };
  });
}

export const useUpdateGrupoQuantidade = () => {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async (input: {
      inventarioId: string;
      itens: InventarioItem[];
      quantidadeEncontradaTotal: number;
      statusEtiqueta?: StatusEtiqueta;
    }) => {
      const key = ["inventario_detalhe", input.inventarioId];
      const previous = qc.getQueryData<DetalheCache>(key);
      const now = new Date().toISOString();
      const dist = calcularDistribuicaoGrupo(input.itens, input.quantidadeEncontradaTotal);
      const byId = new Map(dist.map((d) => [d.id, d]));
      if (previous) {
        qc.setQueryData<DetalheCache>(key, {
          ...previous,
          itens: previous.itens.map((it) => {
            const patch = byId.get(it.id);
            if (!patch) return it;
            return {
              ...it,
              quantidade_encontrada: patch.quantidade_encontrada,
              status_conferencia: patch.status_conferencia,
              status_etiqueta: input.statusEtiqueta ?? it.status_etiqueta,
              metodo_conferencia: "quantidade",
              conferido_em: now,
            };
          }),
        });
      }
      return { previous, key };
    },
    mutationFn: async (input: {
      inventarioId: string;
      itens: InventarioItem[];
      quantidadeEncontradaTotal: number;
      statusEtiqueta?: StatusEtiqueta;
    }) => {
      const now = new Date().toISOString();
      const dist = calcularDistribuicaoGrupo(input.itens, input.quantidadeEncontradaTotal);

      // Agrupa atualizações idênticas em lotes paralelos (.in) em vez de 1 requisição por item
      const buckets = new Map<
        string,
        { ids: string[]; quantidade_encontrada: number; status_conferencia: StatusConferencia }
      >();
      for (const d of dist) {
        const bKey = `${d.status_conferencia}:${d.quantidade_encontrada}`;
        const existing = buckets.get(bKey);
        if (existing) {
          existing.ids.push(d.id);
        } else {
          buckets.set(bKey, {
            ids: [d.id],
            quantidade_encontrada: d.quantidade_encontrada,
            status_conferencia: d.status_conferencia,
          });
        }
      }

      await Promise.all(
        Array.from(buckets.values()).map(async (bucket) => {
          const payload: Record<string, unknown> = {
            quantidade_encontrada: bucket.quantidade_encontrada,
            status_conferencia: bucket.status_conferencia,
            metodo_conferencia: "quantidade",
            conferido_em: now,
          };
          if (input.statusEtiqueta) {
            payload.status_etiqueta = input.statusEtiqueta;
          }
          const { error } = await supabase
            .from("inventario_itens")
            .update(payload)
            .in("id", bucket.ids);
          if (error) throw error;
        }),
      );

      syncResumoFromCacheInBackground(qc, input.inventarioId);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

export const useAddBemExtra = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      inventarioId: string;
      descricao: string;
      quantidade: number;
      codigo_patrimonial?: string;
      localizacao?: string;
      observacoes?: string;
      autor?: string;
    }) => {
      const { error } = await supabase.from("inventario_bens_extras").insert({
        inventario_id: input.inventarioId,
        descricao: input.descricao.trim(),
        quantidade: Math.max(1, Math.round(input.quantidade || 1)),
        codigo_patrimonial: input.codigo_patrimonial?.trim() || null,
        localizacao: input.localizacao?.trim() || null,
        observacoes: input.observacoes?.trim() || null,
      });
      if (error) throw error;
      await syncResumoInventario(input.inventarioId);
      await registrarHistorico(
        input.inventarioId,
        "bem_extra_adicionado",
        `Bem extra adicionado: ${input.descricao.trim()} (Qtd: ${input.quantidade}).`,
        input.autor,
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inventario_detalhe", vars.inventarioId] });
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

export const useRemoveBemExtra = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; inventarioId: string }) => {
      const { error } = await supabase.from("inventario_bens_extras").delete().eq("id", input.id);
      if (error) throw error;
      await syncResumoInventario(input.inventarioId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inventario_detalhe", vars.inventarioId] });
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["inventario_itens_all"] });
    },
  });
};

export const useConcluirInventario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      inventario: InventarioRecord;
      relatorioBlob: Blob;
      arquivarEmDocumentos: boolean;
    }) => {
      const fileName = `inventario-${input.inventario.igreja_nome.replace(/[^a-zA-Z0-9]+/g, "_")}-${input.inventario.data_inventario}.pdf`;
      const relatorioUrl = await uploadInventoryPdf(input.relatorioBlob, "relatorios", fileName);

      let envioId: string | null = input.inventario.envio_documento_id;
      let arquivado = input.inventario.arquivado_documentos;

      if (input.arquivarEmDocumentos && !arquivado) {
        const mesRef = input.inventario.data_inventario.slice(0, 7);
        const protocolo = gerarProtocolo();
        const { data: envio, error: envioErr } = await supabase
          .from("envios")
          .insert({
            igreja_id: input.inventario.igreja_id,
            igreja_nome: input.inventario.igreja_nome,
            tipo_formulario: "14.5 Ata de inventário de bens móveis",
            nome_responsavel: input.inventario.responsavel,
            arquivo_nome: fileName,
            arquivo_url: relatorioUrl,
            mes_referencia: mesRef,
            protocolo,
          })
          .select()
          .single();
        if (envioErr) throw envioErr;
        envioId = envio.id;
        arquivado = true;
        await registrarHistorico(
          input.inventario.id,
          "arquivado_documentos",
          `Relatório arquivado em Documentos (Protocolo ${protocolo}).`,
          input.inventario.responsavel,
        );
      }

      await syncResumoInventario(input.inventario.id);

      const { error } = await supabase
        .from("inventarios")
        .update({
          status: "concluido",
          relatorio_final_url: relatorioUrl,
          arquivado_documentos: arquivado,
          envio_documento_id: envioId,
        })
        .eq("id", input.inventario.id);
      if (error) throw error;

      await registrarHistorico(
        input.inventario.id,
        "concluido",
        "Inventário concluído e relatório final gerado.",
        input.inventario.responsavel,
      );

      return { relatorioUrl, arquivado };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inventario_detalhe", vars.inventario.id] });
      qc.invalidateQueries({ queryKey: ["inventarios"] });
      qc.invalidateQueries({ queryKey: ["envios"] });
    },
  });
};