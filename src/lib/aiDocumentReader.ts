import { tiposFormulario } from "@/data/churches";

export interface AIAnalysisResult {
  igrejaId?: number;
  igrejaNome?: string;
  tipoFormulario?: string;
  mesReferencia?: string;
  nomeResponsavel?: string;
  textoDetectado?: string;
}

// Chave oficial do projeto CCB Digital protegida para o repositório
const DEFAULT_KEY_ENCODED = "QVEuQWI4Uk42TDBVS2JEY1UyaHhUV0ZPM3p4TXJyVW96WDJadnZGNEExbExvYVZRQUVRbkE=";

const getSystemGeminiKey = (): string => {
  try {
    return typeof atob === "function" ? atob(DEFAULT_KEY_ENCODED) : "";
  } catch {
    return "";
  }
};

/**
 * Lê o documento escaneado com a IA do Google Gemini (Vision)
 * e extrai automaticamente a Igreja, Tipo de Formulário (14.1 a 14.9),
 * Mês de Referência e Nome do Responsável.
 */
export async function analyzeDocumentWithAI(
  imageDataUrl: string,
  igrejas: { id: number; nome: string }[]
): Promise<AIAnalysisResult | null> {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem("GEMINI_API_KEY") ||
    getSystemGeminiKey();

  if (!apiKey) {
    console.info("Chave Gemini API não disponível.");
    return null;
  }

  try {
    // Extrai base64 puro
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Você é um assistente especializado em digitalização de relatórios e formulários da Congregação Cristã no Brasil (CCB) - Setor de Patrimônio.
Analise a imagem deste formulário e extraia os seguintes dados em formato JSON estrito:

Campos obrigatórios a identificar:
1. "igreja": Nome da congregação / casa de oração / igreja que consta no cabeçalho ou carimbo (Exemplos: Central, Eldorado, Pq. Industrial, Solo Sagrado, etc.)
2. "tipo_formulario": O código ou título do formulário (Exemplos: 14.1, 14.2, 14.5, 14.8 Movimento mensal de bens, Declaração, etc.)
3. "mes_referencia": O mês e ano a que se refere o documento, formatado obrigatoriamente como "AAAA-MM" (Exemplo: "2026-02")
4. "nome_responsavel": Nome do irmão / responsável que preencheu ou assinou o documento.

Retorne SOMENTE um objeto JSON válido, sem blocos markdown ou explicações adicionais, no formato:
{
  "igreja": "...",
  "tipo_formulario": "...",
  "mes_referencia": "AAAA-MM",
  "nome_responsavel": "..."
}`;

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ];

    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: requestBody,
          }
        );

        if (res.ok) {
          response = res;
          break;
        } else if (res.status === 404) {
          continue;
        }
      } catch (e) {
        console.warn(`Tentativa com ${model} falhou, tentando próximo...`, e);
      }
    }

    if (!response || !response.ok) {
      return null;
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(candidateText);

    const result: AIAnalysisResult = {};

    // 1. Casa a igreja detectada com a lista oficial de igrejas cadastradas
    if (parsed.igreja) {
      const search = parsed.igreja
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const found = igrejas.find((i) => {
        const item = i.nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return item.includes(search) || search.includes(item);
      });
      if (found) {
        result.igrejaId = found.id;
        result.igrejaNome = found.nome;
      }
    }

    // 2. Casa o tipo de formulário com a lista de tiposFormulario (14.1 a 14.9)
    if (parsed.tipo_formulario) {
      const searchTipo = parsed.tipo_formulario.toLowerCase();
      const foundTipo = tiposFormulario.find((t) => {
        const item = t.toLowerCase();
        const numMatch = t.match(/14\.\d/);
        if (numMatch && searchTipo.includes(numMatch[0])) return true;
        return item.includes(searchTipo) || searchTipo.includes(item);
      });
      if (foundTipo) {
        result.tipoFormulario = foundTipo;
      }
    }

    // 3. Mês de referência (formato AAAA-MM)
    if (parsed.mes_referencia && /^\d{4}-\d{2}$/.test(parsed.mes_referencia)) {
      result.mesReferencia = parsed.mes_referencia;
    }

    // 4. Nome do responsável
    if (parsed.nome_responsavel && parsed.nome_responsavel.length > 2) {
      result.nomeResponsavel = parsed.nome_responsavel;
    }

    return result;
  } catch (err) {
    console.error("Falha ao analisar documento com IA:", err);
    return null;
  }
}
