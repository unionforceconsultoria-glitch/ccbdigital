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

    // Aplica o filtro de digitalização Preto e Branco de alta visibilidade
    const totalPixels = width * height;
    const gray = new Uint8Array(totalPixels);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
    }

    const blockSize = Math.max(16, Math.floor(Math.min(width, height) / 22));
    const gridW = Math.ceil(width / blockSize);
    const gridH = Math.ceil(height / blockSize);
    const bgMap = new Uint8Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let maxVal = 0;
        let sum = 0;
        let count = 0;
        const y0 = gy * blockSize;
        const y1 = Math.min(height, y0 + blockSize);
        const x0 = gx * blockSize;
        const x1 = Math.min(width, x0 + blockSize);
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const v = gray[y * width + x];
            sum += v;
            count++;
            if (v > maxVal) maxVal = v;
          }
        }
        const avg = count > 0 ? sum / count : 128;
        bgMap[gy * gridW + gx] = Math.round(maxVal * 0.75 + avg * 0.25);
      }
    }

    for (let y = 0; y < height; y++) {
      const gy = Math.min(gridH - 1, Math.floor(y / blockSize));
      for (let x = 0; x < width; x++) {
        const gx = Math.min(gridW - 1, Math.floor(x / blockSize));
        const localPaper = bgMap[gy * gridW + gx];
        const val = gray[y * width + x];
        const idx = (y * width + x) * 4;
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
