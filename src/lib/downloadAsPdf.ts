import { PDFDocument, PageSizes } from "pdf-lib";

async function imageToJpegBytes(blob: Blob): Promise<Uint8Array> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    const out = await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("falha"))), "image/jpeg", 0.92));
    return new Uint8Array(await out.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Converte qualquer documento (PDF ou imagem) em um Blob PDF. */
export async function toPdfBlob(blob: Blob, url = ""): Promise<Blob> {
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const isPdf = String.fromCharCode(...head).startsWith("%PDF") || blob.type === "application/pdf" || /\.pdf($|\?)/i.test(url);
  if (isPdf) return new Blob([blob], { type: "application/pdf" });

  const pdf = await PDFDocument.create();
  const jpg = await pdf.embedJpg(await imageToJpegBytes(blob));
  const [pw, ph] = jpg.width > jpg.height ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
  const page = pdf.addPage([pw, ph]);
  const m = 20;
  const s = Math.min((pw - 2 * m) / jpg.width, (ph - 2 * m) / jpg.height);
  const w = jpg.width * s, h = jpg.height * s;
  page.drawImage(jpg, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function pdfFileName(nome: string): string {
  const base = (nome || "documento").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "documento";
  return `${base}.pdf`;
}

export async function downloadAsPdf(arquivoUrl: string, nome: string): Promise<void> {
  const res = await fetch(arquivoUrl);
  if (!res.ok) throw new Error("Falha ao baixar");
  const pdf = await toPdfBlob(await res.blob(), arquivoUrl);
  const url = URL.createObjectURL(pdf);
  const a = document.createElement("a");
  a.href = url;
  a.download = pdfFileName(nome);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
