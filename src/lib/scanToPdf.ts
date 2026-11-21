import jsPDF from "jspdf";

export interface ScanResult {
  pdfFile: File;
  previewUrl: string;
  originalName: string;
}

/**
 * Converte automaticamente uma foto/imagem tirada de celular ou galeria
 * em um documento PDF A4 oficial, com filtro de digitalização profissional:
 * - Branqueamento do papel (elimina sombras de celular, dedos e mesa)
 * - Alto contraste e nitidez em textos, linhas, carimbos e assinaturas
 * - Enquadramento proporcional exato em folha A4 (sem cortes)
 */
export async function convertImageToScannedPdf(
  file: File,
  onProgress?: (message: string) => void
): Promise<ScanResult> {
  onProgress?.("Carregando imagem...");

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Falha ao abrir a imagem capturada"));
      el.src = imageUrl;
    });

    onProgress?.("Digitalizando e removendo sombras...");

    // Redimensionamento inteligente para manter alta nitidez sem pesar o arquivo
    const MAX_DIM = 2200;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        width = MAX_DIM;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      throw new Error("Não foi possível inicializar o canvas de digitalização");
    }

    // Desenha imagem original redimensionada
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Amostragem para calcular a cor média do fundo do papel
    let sumLight = 0;
    let lightSamples = 0;
    const sampleStep = Math.max(4, Math.floor(data.length / 50000));
    for (let i = 0; i < data.length; i += sampleStep * 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum > 120) {
        sumLight += lum;
        lightSamples++;
      }
    }

    const avgPaperLum = lightSamples > 0 ? sumLight / lightSamples : 205;
    // Ponto de corte para branco puro
    const paperThreshold = Math.min(235, Math.max(175, avgPaperLum - 15));
    const contrast = 1.35;

    // Aplica o filtro de digitalização estilo scanner
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum >= paperThreshold) {
        // Fundo do papel vira branco 100% puro
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        // Traço de caneta, impressão e carimbos recebem alto contraste
        const factor = Math.min(1, lum / paperThreshold);
        const darkened = Math.pow(factor, contrast) * 255;
        const ratio = lum > 0 ? darkened / lum : 1;

        data[i] = Math.min(255, Math.max(0, Math.round(r * ratio)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(g * ratio)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(b * ratio)));
      }
    }

    ctx.putImageData(imgData, 0, 0);

    onProgress?.("Gerando documento PDF A4...");
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.88);

    // Cria o PDF A4 oficial
    const isLandscape = width > height;
    const pdf = new jsPDF({
      orientation: isLandscape ? "l" : "p",
      unit: "mm",
      format: "a4",
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Margem de segurança de 6mm nas bordas para garantir impressão física 100% sem cortes
    const margin = 6;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    const imgRatio = width / height;
    const pageRatio = availW / availH;

    let drawW: number;
    let drawH: number;
    if (imgRatio > pageRatio) {
      drawW = availW;
      drawH = availW / imgRatio;
    } else {
      drawH = availH;
      drawW = availH * imgRatio;
    }

    const offX = margin + (availW - drawW) / 2;
    const offY = margin + (availH - drawH) / 2;

    pdf.addImage(jpegDataUrl, "JPEG", offX, offY, drawW, drawH, undefined, "FAST");

    const pdfBlob = pdf.output("blob");

    // Limpa o nome original e adiciona a extensão .pdf
    const cleanBase = (file.name || "foto")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-. ]+/g, "_")
      .trim();

    const pdfFile = new File(
      [pdfBlob],
      `${cleanBase || "documento"}-digitalizado.pdf`,
      {
        type: "application/pdf",
        lastModified: Date.now(),
      }
    );

    return {
      pdfFile,
      previewUrl: jpegDataUrl,
      originalName: file.name,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
