import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

/**
 * Converte uma imagem em PDF A4 (uma página, centralizada).
 * Se o arquivo já for PDF, retorna o próprio arquivo.
 */
export async function imageFileToPdf(file: File): Promise<File> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return file;
  if (!file.type.startsWith("image/")) return file;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Falha ao carregar imagem"));
    i.src = dataUrl;
  });

  const orientation = img.width > img.height ? "l" : "p";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const format = file.type === "image/png" ? "PNG" : "JPEG";
  pdf.addImage(dataUrl, format, x, y, w, h);

  const blob = pdf.output("blob");
  const newName = file.name.replace(/\.[^.]+$/, "") + ".pdf";
  return new File([blob], newName, { type: "application/pdf" });
}

/**
 * Mescla múltiplos PDFs (a partir de URLs) em um único PDF.
 * Imagens também podem ser passadas — viram páginas A4 centralizadas.
 */
export async function mergeFilesFromUrls(
  items: { url: string; nome: string }[]
): Promise<Blob> {
  const merged = await PDFDocument.create();

  for (const item of items) {
    try {
      const res = await fetch(item.url);
      const bytes = await res.arrayBuffer();
      const lower = item.nome.toLowerCase();

      if (lower.endsWith(".pdf")) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } else if (/\.(jpe?g|png)$/i.test(lower)) {
        const isPng = /\.png$/i.test(lower);
        const img = isPng
          ? await merged.embedPng(bytes)
          : await merged.embedJpg(bytes);
        const A4 = { w: 595.28, h: 841.89 };
        const margin = 14;
        const maxW = A4.w - margin * 2;
        const maxH = A4.h - margin * 2;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const page = merged.addPage([A4.w, A4.h]);
        page.drawImage(img, {
          x: (A4.w - w) / 2,
          y: (A4.h - h) / 2,
          width: w,
          height: h,
        });
      } else {
        console.warn("Tipo não suportado para mesclagem:", item.nome);
      }
    } catch (err) {
      console.error("Falha ao mesclar arquivo:", item.nome, err);
    }
  }

  const out = await merged.save();
  return new Blob([out.buffer as ArrayBuffer], { type: "application/pdf" });
}