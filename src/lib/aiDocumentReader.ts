import { tiposFormulario } from "@/data/churches";

export interface AIAnalysisResult {
  igrejaId?: number;
  igrejaNome?: string;
  tipoFormulario?: string;
  mesReferencia?: string;
  nomeResponsavel?: string;
  textoDetectado?: string;
}

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
    "";

  if (!apiKey) {
    console.info("Chave Gemini API não configurada. Configure VITE_GEMINI_API_KEY ou no localStorage.");
    return null;
  }

  try {
    // Extrai base64 puro
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Você é um assistente especializado em digitalização de relatórios e formulários da Congregação Cristã no Brasil (CCB) - Setor de Patrimônio.
Analise a imagem deste formulário e extraia os seguintes dados em formato JSON estrito:

Campos obrigatórios a identificar:
1. "igreja": Nome da congregação / casa de oração / igreja que consta no cabeçalho ou carimbo (Exemplos comuns: Central, Eldorado, Pq. Industrial, Solo Sagrado, etc.)
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

    // Tenta Gemini 2.5 Flash ou 1.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!response.ok) {
      console.warn("Erro na chamada da Gemini API:", await response.text());
      return null;
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(candidateText);

    const result: AIAnalysisResult = {};

    // 1. Casa a igreja detectada com a lista oficial de igrejas cadastradas
    if (parsed.igreja) {
      const search = parsed.igreja.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const found = igrejas.find((i) => {
        const item = i.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
        // Verifica se bate o número (ex: 14.8) ou palavras-chave
        const numMatch = t.match(/14\.\d/);
        if (numMatch && searchTipo.includes(numMatch[0])) return true;
        return item.includes(searchTipo) || searchTipo.includes(item);
      });
      if (foundTipo) {
        result.tipoFormulario = foundTipo;
      }
    }

    // 3. Mês de referência (formato YYYY-MM)
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
