import type { ExtractedInventoryItem } from "@/lib/inventoryUtils";

export interface PdfTextToken {
  str: string;
  x: number;
  y: number;
}

interface ColumnLayout {
  headerY: number;
  codeEndX: number;
  nomeStartX: number;
  nomeEndX: number;
  localidadeStartX: number;
  localidadeEndX: number;
  depStartX: number;
  depEndX: number;
}

const CODE_PATTERN = /^(\d{1,3}[-/]\d{3,6})\s*\/\s*(\d{2,8})$/;
const CHURCH_CODE_IN_LOCALIDADE = /(\d{2}[-/]\d{3,6})/;
const FOOTER_SKIP_RE = /\b(total|cnpj|página|pagina|relatório de bens|relatorio de bens|emissão|emissao)\b/i;

export function classificarCategoriaPorDescricao(descricao: string): string {
  const d = descricao.toLowerCase();
  if (/\b(extintor|alarme|câmera|camera|cftv|hidrante|emergência|emergencia|cofre)\b/.test(d)) return "Segurança";
  if (/\b(som|caixa de som|microfone|mesa de som|amplificador|pedestal|alto[- ]?falante|equalizador|sonoriz)\b/.test(d)) return "Som e Áudio";
  if (/\b(órgão|orgao|estante.*music|partitura|instrumento|piano|violino|violão|violao|hinário|hinario)\b/.test(d)) return "Instrumentos";
  if (/\b(ventilador|ar[- ]?condicionado|climatizador|exaustor|aquecedor|circulador)\b/.test(d)) return "Climatização";
  if (/\b(geladeira|refrigerador|fogão|fogao|bebedouro|purificador|micro[- ]?ondas|cafeteira|freezer|liquidificador|forno)\b/.test(d)) return "Eletrodomésticos";
  if (/\b(computador|notebook|impressora|monitor|roteador|nobreak|teclado|mouse|projetor|datashow|switch|tv|televis)\b/.test(d)) return "Informática";
  if (/\b(terreno|imóvel|imovel|edifica|instalaç|instalac|benfeitoria|portão|portao|construç|construc)\b/.test(d)) return "Imóveis e Instalações";
  if (/\b(furadeira|escada|roçadeira|rocadeira|cortador|ferramenta|lavadora|aspirador|compressor|mangueira)\b/.test(d)) return "Ferramentas";
  if (/\b(banco|genuflex|cadeira|mesa|armário|armario|estante|balcão|balcao|bancada|prateleira|tribuna|púlpito|pulpito|escrivaninha|sofá|sofa|poltrona|rack|quadro|lousa|cortina|tapete)\b/.test(d)) return "Mobiliário";
  return "Geral";
}

function joinTokensInOrder(tokens: PdfTextToken[]): string {
  if (tokens.length === 0) return "";
  // Agrupa por linha (y descendente, tolerância de 3px) e ordena por x ascendente
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextToken[][] = [];
  for (const tok of sorted) {
    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine[0]!.y - tok.y) <= 3) {
      lastLine.push(tok);
    } else {
      lines.push([tok]);
    }
  }
  return lines
    .map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((t) => t.str.trim())
        .join(" "),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectColumnLayout(tokens: PdfTextToken[]): ColumnLayout | null {
  // Procura cabeçalho da tabela CCB ("Nome", "Fornecedor", "Localidade", "Dependência")
  const nomeTokens = tokens.filter((t) => /^nome$/i.test(t.str.trim()));
  for (const nomeTok of nomeTokens) {
    const row = tokens.filter((t) => Math.abs(t.y - nomeTok.y) <= 4);
    const fornecedor = row.find((t) => /^fornecedor$/i.test(t.str.trim()));
    const localidade = row.find((t) => /^localidade$/i.test(t.str.trim()));
    const conta = row.find((t) => /^conta$/i.test(t.str.trim()));
    const dep = row.find((t) => /^depend[êe]ncia$/i.test(t.str.trim()));
    const dtAq = row
      .filter((t) => /^(dt\.?|aquisi[çc][ãa]o)$/i.test(t.str.trim()) && t.x > (dep?.x ?? 0))
      .sort((a, b) => a.x - b.x)[0];
    if (fornecedor && localidade && dep) {
      return {
        headerY: nomeTok.y,
        codeEndX: nomeTok.x - 4,
        nomeStartX: nomeTok.x - 4,
        nomeEndX: fornecedor.x - 12,
        localidadeStartX: localidade.x - 5,
        localidadeEndX: (conta?.x ?? localidade.x + 50) - 5,
        depStartX: dep.x - 5,
        depEndX: (dtAq?.x ?? dep.x + 65) - 5,
      };
    }
  }
  return null;
}

function restaurarCodigoIgreja(rawCode: string, localidadeText: string, headerChurchCode: string | null): string {
  const match = rawCode.match(CODE_PATTERN);
  if (!match) return rawCode;
  let igrejaPart = match[1]!;
  const itemPart = match[2]!;

  const refChurch = localidadeText.match(CHURCH_CODE_IN_LOCALIDADE)?.[1] ?? headerChurchCode;
  if (refChurch && refChurch !== igrejaPart && refChurch.endsWith(igrejaPart)) {
    igrejaPart = refChurch;
  }
  return `${igrejaPart} / ${itemPart}`;
}

function extrairObsLocalizacao(descricao: string, dependencia: string): string | null {
  const obsMatch = descricao.match(/\bOBS\s*:\s*([^.;]+?)(?:\.|$)/i);
  if (obsMatch && obsMatch[1]?.trim()) {
    return obsMatch[1].trim();
  }
  return dependencia || null;
}

/**
 * Extrai itens diretamente das páginas de texto do PDF oficial da CCB ("Relatório de Bens Imobilizado").
 * Função pura — aceita os tokens de cada página para permitir testes unitários rápidos.
 */
export function parseCcbReportPages(pagesTokens: PdfTextToken[][]): ExtractedInventoryItem[] {
  let layout: ColumnLayout | null = null;
  let headerChurchCode: string | null = null;
  const results: ExtractedInventoryItem[] = [];

  for (let pageIdx = 0; pageIdx < pagesTokens.length; pageIdx++) {
    const tokens = pagesTokens[pageIdx] ?? [];
    if (tokens.length === 0) continue;

    const detected = detectColumnLayout(tokens);
    if (detected) {
      layout = detected;
      // Captura código da igreja no cabeçalho da página ("BR 22-4471")
      const headerText = joinTokensInOrder(tokens.filter((t) => t.y > detected.headerY + 5));
      const churchMatch = headerText.match(CHURCH_CODE_IN_LOCALIDADE);
      if (churchMatch?.[1]) {
        headerChurchCode = churchMatch[1];
      }
    }

    if (!layout) continue;

    const maxY = detected ? detected.headerY - 3 : Infinity;
    const bodyTokens = tokens.filter((t) => t.y < maxY);

    // Encontra todas as linhas-âncora pela coluna Código (x < codeEndX)
    const codeTokens = bodyTokens.filter((t) => t.x < layout!.codeEndX);
    const codeLines: { y: number; text: string }[] = [];
    const sortedCode = [...codeTokens].sort((a, b) => b.y - a.y || a.x - b.x);
    for (const tok of sortedCode) {
      const last = codeLines[codeLines.length - 1];
      if (last && Math.abs(last.y - tok.y) <= 2.5) {
        last.text = `${last.text} ${tok.str.trim()}`.replace(/\s+/g, " ").trim();
      } else {
        codeLines.push({ y: tok.y, text: tok.str.trim() });
      }
    }

    const anchors = codeLines.filter((l) => CODE_PATTERN.test(l.text));
    if (anchors.length === 0) continue;

    // Identifica limite inferior de rodapé ("Total" ou fim da tabela)
    const totalToken = bodyTokens
      .filter((t) => /^total$/i.test(t.str.trim()) && t.y < anchors[anchors.length - 1]!.y)
      .sort((a, b) => b.y - a.y)[0];
    const footerY = totalToken ? totalToken.y + 3 : 20;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i]!;
      const nextAnchor = anchors[i + 1];
      const bandTop = anchor.y + 3.5;
      const bandBottom = nextAnchor ? nextAnchor.y + 3.5 : Math.max(footerY, anchor.y - 36);

      const bandTokens = bodyTokens.filter((t) => t.y <= bandTop && t.y > bandBottom);

      const nomeRaw = joinTokensInOrder(
        bandTokens.filter((t) => t.x >= layout!.nomeStartX && t.x < layout!.nomeEndX),
      );
      if (!nomeRaw || FOOTER_SKIP_RE.test(nomeRaw)) continue;

      const localidadeText = joinTokensInOrder(
        bandTokens.filter((t) => t.x >= layout!.localidadeStartX && t.x < layout!.localidadeEndX),
      );
      const dependenciaText = joinTokensInOrder(
        bandTokens.filter((t) => t.x >= layout!.depStartX && t.x < layout!.depEndX),
      )
        .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const codigo = restaurarCodigoIgreja(anchor.text, localidadeText, headerChurchCode);
      const localizacao = extrairObsLocalizacao(nomeRaw, dependenciaText);
      const categoria = classificarCategoriaPorDescricao(nomeRaw);

      results.push({
        codigo_patrimonial: codigo,
        descricao: nomeRaw,
        categoria,
        localizacao,
        quantidade: 1,
      });
    }
  }

  return results;
}

/**
 * Tenta ler o PDF localmente no navegador (~150-300ms) usando pdfjs-dist.
 * Retorna lista vazia se o PDF for digitalizado (imagem) ou de outro layout,
 * permitindo fallback automático para a leitura por IA/OCR no servidor.
 */
export async function extrairItensDoPdfLocal(
  file: File,
): Promise<{ itens: ExtractedInventoryItem[]; observacoes_documento: string | null }> {
  try {
    const [pdfjsLib, workerMod] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
    }

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;

    const pagesTokens: PdfTextToken[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const tokens: PdfTextToken[] = [];
      for (const raw of content.items) {
        if ("str" in raw && typeof raw.str === "string" && raw.str.trim().length > 0) {
          tokens.push({
            str: raw.str,
            x: raw.transform[4] ?? 0,
            y: raw.transform[5] ?? 0,
          });
        }
      }
      pagesTokens.push(tokens);
    }

    const itens = parseCcbReportPages(pagesTokens);
    if (itens.length > 0) {
      return {
        itens,
        observacoes_documento: `Leitura rápida concluída: ${itens.length} itens extraídos de ${doc.numPages} página(s).`,
      };
    }
    return { itens: [], observacoes_documento: null };
  } catch (err) {
    console.warn("[inventoryPdfParser] Fallback para OCR no servidor:", err);
    // Qualquer falha na leitura local aciona automaticamente o fallback por IA/OCR
    return { itens: [], observacoes_documento: null };
  }
}