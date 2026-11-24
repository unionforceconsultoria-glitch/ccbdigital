import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6.1-sol";

const SYSTEM_INSTRUCTIONS = `Você é um especialista em inventário patrimonial da Congregação Cristã no Brasil (CCB).
Sua tarefa é ler o PDF fornecido (usando extração de texto e OCR visual quando for digitalizado) e extrair TODOS os bens patrimoniais listados no documento.

Formato mais comum — "Relatório de Bens Imobilizado" do sistema oficial da CCB:
- Coluna à esquerda "Código" (ex.: "22-4471 / 000001"): este é SEMPRE o "codigo_patrimonial" usado na etiqueta física do bem. O primeiro número ("22-4471") é o código da igreja e o número após a barra ("000001") é o código do item dentro dessa igreja. Preserve exatamente como aparece na coluna "Código".
- NÃO confunda o "codigo_patrimonial" com o número prefixo do produto dentro da coluna "Nome" (ex.: "56 - ", "4 - ", "1 - ", "11.006 - "), nem com "Localidade" ("BR 22-4471"), "Conta" ("1101") ou "Nº Documento".
- Coluna "Nome": use como "descricao" completa do bem.
- Coluna "Dependência" (ex.: "SALAO DE CULTO", "SALA DE REUNIÃO", "DORMITÓRIO"): use como "localizacao". Se a descrição tiver "OBS: <ambiente>" (ex.: "OBS: SALINHA DE ORAÇÃO"), use esse ambiente como "localizacao" pois indica onde o bem está; caso contrário use a coluna "Dependência" ou null.
- Extraia TODAS as linhas de bens de TODAS as páginas (inclusive status "Ativo" e "Depreciado"). Ignore apenas cabeçalhos de filtro (Data Posição, Subgrupo, Fornecedor, etc.), rodapés de endereço/CNPJ e a linha final de "Total".

Regras obrigatórias:
1. Extraia cada registro patrimonial encontrado no documento preservando o código patrimonial individual da coluna à esquerda quando existir (ex.: "22-4471 / 000001", placa, tombamento, etiqueta).
2. Se o documento listar 80 linhas individuais com códigos diferentes, retorne os 80 registros individuais (cada um com quantidade 1 e seu respectivo código patrimonial), sem resumir nem omitir páginas.
3. Se o documento listar uma linha resumida com quantidade (ex.: "Cadeira plástica — Qtd: 20" sem códigos individuais), retorne quantidade: 20.
4. Preencha "categoria" com uma categoria clara em português (ex.: Mobiliário, Som e Áudio, Instrumentos, Climatização, Segurança, Eletrodomésticos, Informática, Imóveis e Instalações, Ferramentas, Geral).
5. Preencha "localizacao" com a Dependência/ambiente quando informado; caso contrário null.
6. Não invente itens que não estejam no documento. Se não houver itens legíveis, retorne lista vazia e explique em observacoes_documento.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itens", "observacoes_documento"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["codigo_patrimonial", "descricao", "categoria", "localizacao", "quantidade"],
        properties: {
          codigo_patrimonial: { type: ["string", "null"] },
          descricao: { type: "string" },
          categoria: { type: "string" },
          localizacao: { type: ["string", "null"] },
          quantidade: { type: "integer" },
        },
      },
    },
    observacoes_documento: { type: ["string", "null"] },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave de IA não configurada no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const fileUrl: string | undefined = body?.fileUrl;
    const fileBase64: string | undefined = body?.fileBase64;
    const filename: string = (body?.filename || "inventario.pdf").toString();

    if (!fileUrl && !fileBase64) {
      return new Response(
        JSON.stringify({ error: "Envie um arquivo PDF válido para análise." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const filePart = fileBase64
      ? {
          type: "input_file",
          filename,
          file_data: fileBase64.startsWith("data:")
            ? fileBase64
            : `data:application/pdf;base64,${fileBase64}`,
        }
      : {
          type: "input_file",
          file_url: fileUrl,
        };

    const incomingRunId = req.headers.get("X-Lovable-AIG-Run-ID")?.trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    };
    if (incomingRunId) {
      headers["X-Lovable-AIG-Run-ID"] = incomingRunId;
    }

    const gatewayRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers,
      signal: req.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        instructions: SYSTEM_INSTRUCTIONS,
        text: {
          format: {
            type: "json_schema",
            name: "inventario_patrimonial_extracao",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Extraia todos os bens patrimoniais deste PDF de inventário seguindo o formato estruturado.",
              },
              filePart,
            ],
          },
        ],
      }),
    });

    const mintedRunId = gatewayRes.headers.get("X-Lovable-AIG-Run-ID")?.trim();
    const outHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
    };
    if (mintedRunId) {
      outHeaders["X-Lovable-AIG-Run-ID"] = mintedRunId;
    }

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      let message = "Não foi possível processar o PDF no momento.";
      try {
        const parsed = JSON.parse(errText);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        if (errText) message = errText.slice(0, 300);
      }
      return new Response(JSON.stringify({ error: message }), {
        status: gatewayRes.status,
        headers: outHeaders,
      });
    }

    // Consome SSE stream
    const reader = gatewayRes.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "Resposta vazia do serviço de análise." }), {
        status: 502,
        headers: outHeaders,
      });
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let outputText = "";
    let streamError: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            outputText += evt.delta;
          } else if (evt.type === "response.failed" || evt.type === "error") {
            streamError = evt?.error?.message || evt?.response?.error?.message || "Erro durante leitura do PDF.";
          } else if (evt.type === "response.completed" && !outputText) {
            const outputs = evt?.response?.output || [];
            for (const item of outputs) {
              for (const part of item?.content || []) {
                if (part?.type === "output_text" && typeof part?.text === "string") {
                  outputText += part.text;
                }
              }
            }
          }
        } catch {
          // ignora linhas parciais não JSON
        }
      }
    }

    if (streamError) {
      return new Response(JSON.stringify({ error: streamError }), {
        status: 502,
        headers: outHeaders,
      });
    }

    if (!outputText.trim()) {
      return new Response(
        JSON.stringify({
          itens: [],
          observacoes_documento: "Nenhum texto ou item legível foi encontrado no PDF.",
        }),
        { status: 200, headers: outHeaders },
      );
    }

    const parsed = JSON.parse(outputText);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: outHeaders,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Operação cancelada." }), {
        status: 499,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const message = err instanceof Error ? err.message : "Erro inesperado ao processar o PDF.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});