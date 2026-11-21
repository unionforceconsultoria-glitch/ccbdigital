import { PDFDocument, PageSizes } from "pdf-lib";
import { saveAs } from "file-saver";

export interface EnvioDocumento {
  id: string;
  arquivo_nome: string;
  arquivo_url: string;
  igreja_nome: string;
  tipo_formulario: string;
  protocolo?: string;
  mes_referencia?: string;
}

/**
 * Aplica um filtro de digitalização profissional na imagem:
 * - Branqueia fundos cinzas/amarelados e remove sombras de foto de celular
 * - Realça o contraste e nitidez de textos, canetas e carimbos
 * - Garante que o documento fique limpo para impressão e arquivo
 */
export async function enhanceImageForPrint(imageUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar canvas 2D"));
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Amostragem rápida para estimar o tom médio de papel/fundo
        let sumLight = 0;
        let lightSamples = 0;
        const step = Math.max(4, Math.floor(data.length / 40000));
        for (let i = 0; i < data.length; i += step * 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > 120) {
            sumLight += lum;
            lightSamples++;
          }
        }

        const avgPaperLum = lightSamples > 0 ? sumLight / lightSamples : 200;
        // Ponto de corte para considerar o pixel como papel branco
        const paperThreshold = Math.min(235, Math.max(175, avgPaperLum - 15));

        // Aplicação do filtro de digitalização Preto e Branco de alta visibilidade
        const totalPixels = canvas.width * canvas.height;
        const gray = new Uint8Array(totalPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
        }

        const blockSize = Math.max(16, Math.floor(Math.min(canvas.width, canvas.height) / 22));
        const gridW = Math.ceil(canvas.width / blockSize);
        const gridH = Math.ceil(canvas.height / blockSize);
        const bgMap = new Uint8Array(gridW * gridH);

        for (let gy = 0; gy < gridH; gy++) {
          for (let gx = 0; gx < gridW; gx++) {
            let maxVal = 0;
            let sum = 0;
            let count = 0;
            const y0 = gy * blockSize;
            const y1 = Math.min(canvas.height, y0 + blockSize);
            const x0 = gx * blockSize;
            const x1 = Math.min(canvas.width, x0 + blockSize);
            for (let y = y0; y < y1; y += 2) {
              for (let x = x0; x < x1; x += 2) {
                const v = gray[y * canvas.width + x];
                sum += v;
                count++;
                if (v > maxVal) maxVal = v;
              }
            }
            const avg = count > 0 ? sum / count : 128;
            bgMap[gy * gridW + gx] = Math.round(maxVal * 0.75 + avg * 0.25);
          }
        }

        for (let y = 0; y < canvas.height; y++) {
          const gy = Math.min(gridH - 1, Math.floor(y / blockSize));
          for (let x = 0; x < canvas.width; x++) {
            const gx = Math.min(gridW - 1, Math.floor(x / blockSize));
            const localPaper = bgMap[gy * gridW + gx];
            const val = gray[y * canvas.width + x];
            const idx = (y * canvas.width + x) * 4;
            const threshold = Math.max(75, localPaper - 20);

            if (val >= threshold) {
              data[idx] = 255;
              data[idx + 1] = 255;
              data[idx + 2] = 255;
            } else {
              const dist = threshold - val;
              const darkness = Math.min(1, dist / 28);
              const finalColor = Math.round((1 - darkness) * 35);
              data[idx] = finalColor;
              data[idx + 1] = finalColor;
              data[idx + 2] = finalColor;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Exporta como JPEG de alta qualidade
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Falha ao converter imagem para blob"));
              return;
            }
            const buffer = await blob.arrayBuffer();
            resolve(new Uint8Array(buffer));
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("Falha ao carregar imagem para processamento"));
    img.src = imageUrl;
  });
}

/**
 * Gera um documento PDF unificado no formato A4 oficial,
 * padronizando PDFs e imagens com enquadramento perfeito sem cortes.
 */
export async function generateUnifiedA4Pdf(
  documentos: EnvioDocumento[],
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const total = documentos.length;

  for (let idx = 0; idx < total; idx++) {
    const doc = documentos[idx];
    const isImage = /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(doc.arquivo_nome);

    onProgress?.(
      idx + 1,
      total,
      `Processando ${idx + 1} de ${total}: ${doc.igreja_nome} (${isImage ? "digitalizando foto" : "ajustando PDF"})...`
    );

    try {
      if (isImage) {
        // Processa imagem com filtro de nitidez estilo scanner
        let imageBytes: Uint8Array;
        try {
          imageBytes = await enhanceImageForPrint(doc.arquivo_url);
        } catch {
          // Se o filtro em canvas falhar (ex: CORS rígido), baixa direto
          const res = await fetch(doc.arquivo_url);
          imageBytes = new Uint8Array(await res.arrayBuffer());
        }

        // Tenta embed como JPEG ou PNG
        let embeddedImage;
        try {
          embeddedImage = await mergedPdf.embedJpg(imageBytes);
        } catch {
          embeddedImage = await mergedPdf.embedPng(imageBytes);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Se a foto foi tirada na horizontal, usa A4 paisagem; se vertical, A4 retrato
        const isLandscape = imgWidth > imgHeight;
        const pageSize = isLandscape
          ? [PageSizes.A4[1], PageSizes.A4[0]] // [841.89, 595.28]
          : PageSizes.A4; // [595.28, 841.89]

        const page = mergedPdf.addPage(pageSize as [number, number]);
        const pageW = page.getWidth();
        const pageH = page.getHeight();

        // Margem de segurança de 15pt (~5.3mm) para não cortar em nenhuma impressora física
        const margin = 15;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;

        const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;
        const drawX = (pageW - drawW) / 2;
        const drawY = (pageH - drawH) / 2;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      } else {
        // Documento já é um PDF: baixa e mescla páginas com qualidade vetorial original
        const res = await fetch(doc.arquivo_url);
        const pdfBytes = await res.arrayBuffer();
        const existingPdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(
          existingPdf,
          existingPdf.getPageIndices()
        );

        for (const copiedPage of copiedPages) {
          mergedPdf.addPage(copiedPage);
        }
      }
    } catch (err) {
      console.error(`Erro ao processar documento ${doc.arquivo_nome}:`, err);
    }
  }

  return await mergedPdf.save();
}

/**
 * Abre o PDF unificado na visualização do navegador e aciona a impressão
 */
export async function printUnifiedA4(
  documentos: EnvioDocumento[],
  onProgress?: (current: number, total: number, message: string) => void
): Promise<void> {
  const pdfBytes = await generateUnifiedA4Pdf(documentos, onProgress);
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Abre em uma nova aba com o visualizador de PDF padrão do navegador
  const win = window.open(url, "_blank");
  if (!win) {
    // Caso o navegador bloqueie popups, baixa automaticamente
    saveAs(blob, "Documentos_CCB_Digital_A4.pdf");
  }
}

/**
 * Baixa o PDF unificado A4 no computador
 */
export async function downloadUnifiedA4(
  documentos: EnvioDocumento[],
  nomeArquivo = "Documentos_CCB_Digital_A4.pdf",
  onProgress?: (current: number, total: number, message: string) => void
): Promise<void> {
  const pdfBytes = await generateUnifiedA4Pdf(documentos, onProgress);
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  saveAs(blob, nomeArquivo);
}
