import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  X,
  RotateCcw,
  RotateCw,
  Loader2,
  Maximize2,
  Image as ImageIcon,
  Sparkles,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";

type Point = { x: number; y: number };

function computeHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    }
    [M[i], M[piv]] = [M[piv], M[i]];
    const div = M[i][i] || 1e-9;
    for (let c = i; c <= n; c++) M[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  const h = M.map((r) => r[n]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function orderCorners(pts: Point[]): Point[] {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bot[1], bot[0]]; // TL, TR, BR, BL
}

/**
 * Filtro de Digitalização Preto e Branco de Alta Definição (Estilo Xerox / Scanner B&W):
 * - Papel 100% branco (#FFFFFF) sem sombras ou amarelado
 * - Textos, números, carimbos e assinaturas em preto bem escuro e legível (#000000)
 */
function applyCrispBlackAndWhite(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  const totalPixels = width * height;
  const gray = new Uint8Array(totalPixels);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  // Análise em blocos para compensar iluminação desigual da foto
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
      data[idx + 3] = 255;
    }
  }
}

interface Props {
  onCancel: () => void;
  onDone: (file: File, previewUrl?: string) => void;
}

const DocumentScanner: React.FC<Props> = ({ onCancel, onDone }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"bw" | "color">("bw"); // Padrão: Preto e Branco
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [corners, setCorners] = useState<Point[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => cameraInputRef.current?.click(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) {
      if (!imgSrc) onCancel();
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSrc(url);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      const mx = img.naturalWidth * 0.06;
      const my = img.naturalHeight * 0.06;
      setCorners([
        { x: mx, y: my },
        { x: img.naturalWidth - mx, y: my },
        { x: img.naturalWidth - mx, y: img.naturalHeight - my },
        { x: mx, y: img.naturalHeight - my },
      ]);
    };
    img.src = url;
  };

  useEffect(() => {
    if (!imgSize.w) return;
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const maxW = c.clientWidth;
      const maxH = c.clientHeight;
      const ratio = imgSize.w / imgSize.h;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      setDisplaySize({ w, h });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [imgSize]);

  const scale = displaySize.w && imgSize.w ? displaySize.w / imgSize.w : 1;

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const clamped = {
      x: Math.max(0, Math.min(imgSize.w, px)),
      y: Math.max(0, Math.min(imgSize.h, py)),
    };
    setCorners((c) => c.map((p, i) => (i === dragging ? clamped : p)));
  };

  const resetCorners = () => {
    if (!imgSize.w) return;
    const mx = imgSize.w * 0.06;
    const my = imgSize.h * 0.06;
    setCorners([
      { x: mx, y: my },
      { x: imgSize.w - mx, y: my },
      { x: imgSize.w - mx, y: imgSize.h - my },
      { x: mx, y: imgSize.h - my },
    ]);
  };

  const selectAll = () => {
    if (!imgSize.w) return;
    const m = 4;
    setCorners([
      { x: m, y: m },
      { x: imgSize.w - m, y: m },
      { x: imgSize.w - m, y: imgSize.h - m },
      { x: m, y: imgSize.h - m },
    ]);
  };

  const rotate90 = () => {
    if (!imgRef.current || !imgSrc) return;
    const c = document.createElement("canvas");
    c.width = imgSize.h;
    c.height = imgSize.w;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(imgRef.current, -imgSize.w / 2, -imgSize.h / 2);

    const newUrl = c.toDataURL("image/jpeg", 0.95);
    const newImg = new Image();
    newImg.onload = () => {
      imgRef.current = newImg;
      setImgSrc(newUrl);
      setImgSize({ w: newImg.naturalWidth, h: newImg.naturalHeight });
      const mx = newImg.naturalWidth * 0.06;
      const my = newImg.naturalHeight * 0.06;
      setCorners([
        { x: mx, y: my },
        { x: newImg.naturalWidth - mx, y: my },
        { x: newImg.naturalWidth - mx, y: newImg.naturalHeight - my },
        { x: mx, y: newImg.naturalHeight - my },
      ]);
    };
    newImg.src = newUrl;
  };

  const confirm = async () => {
    if (!imgRef.current || corners.length !== 4) return;
    setProcessing(true);
    setProcessingMsg("Corrigindo perspectiva do documento...");

    try {
      const ordered = orderCorners(corners);
      const [tl, tr, br, bl] = ordered;

      const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const widthBot = Math.hypot(br.x - bl.x, br.y - bl.y);
      const heightL = Math.hypot(bl.x - tl.x, bl.y - tl.y);
      const heightR = Math.hypot(br.x - tr.x, br.y - tr.y);

      let outW = Math.round(Math.max(widthTop, widthBot));
      let outH = Math.round(Math.max(heightL, heightR));

      const MAX = 2000;
      if (outW > MAX || outH > MAX) {
        const r = Math.min(MAX / outW, MAX / outH);
        outW = Math.round(outW * r);
        outH = Math.round(outH * r);
      }

      const dstPts: Point[] = [
        { x: 0, y: 0 },
        { x: outW - 1, y: 0 },
        { x: outW - 1, y: outH - 1 },
        { x: 0, y: outH - 1 },
      ];
      const Hinv = computeHomography(dstPts, [tl, tr, br, bl]);

      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = imgSize.w;
      srcCanvas.height = imgSize.h;
      const sctx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
      sctx.drawImage(imgRef.current, 0, 0);
      const srcData = sctx.getImageData(0, 0, imgSize.w, imgSize.h);
      const src = srcData.data;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const octx = outCanvas.getContext("2d", { willReadFrequently: true })!;
      const outImg = octx.createImageData(outW, outH);
      const out = outImg.data;

      const sw = imgSize.w;
      const sh = imgSize.h;

      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const denom = Hinv[6] * x + Hinv[7] * y + Hinv[8];
          const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / denom;
          const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / denom;
          const oi = (y * outW + x) * 4;

          if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
            out[oi] = 255;
            out[oi + 1] = 255;
            out[oi + 2] = 255;
            out[oi + 3] = 255;
            continue;
          }

          const x0 = Math.floor(sx);
          const y0 = Math.floor(sy);
          const dx = sx - x0;
          const dy = sy - y0;
          const i00 = (y0 * sw + x0) * 4;
          const i10 = i00 + 4;
          const i01 = i00 + sw * 4;
          const i11 = i01 + 4;

          for (let c = 0; c < 3; c++) {
            const v =
              src[i00 + c] * (1 - dx) * (1 - dy) +
              src[i10 + c] * dx * (1 - dy) +
              src[i01 + c] * (1 - dx) * dy +
              src[i11 + c] * dx * dy;
            out[oi + c] = v;
          }
          out[oi + 3] = 255;
        }
      }

      if (filterMode === "bw") {
        setProcessingMsg("Digitalizando em Preto e Branco de alta visibilidade...");
        applyCrispBlackAndWhite(out, outW, outH);
      } else {
        setProcessingMsg("Aplicando realce colorido...");
        // Realce colorido com branqueamento de fundo
        let sumBg = 0;
        let countBg = 0;
        for (let i = 0; i < out.length; i += 40) {
          const lum = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
          if (lum > 120) {
            sumBg += lum;
            countBg++;
          }
        }
        const paperWhite = countBg > 0 ? sumBg / countBg : 205;
        const threshold = Math.min(235, Math.max(175, paperWhite - 15));
        for (let i = 0; i < out.length; i += 4) {
          const r = out[i];
          const g = out[i + 1];
          const b = out[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum >= threshold) {
            out[i] = 255;
            out[i + 1] = 255;
            out[i + 2] = 255;
          } else {
            const factor = Math.min(1, lum / threshold);
            const darkened = Math.pow(factor, 1.35) * 255;
            const ratio = lum > 0 ? darkened / lum : 1;
            out[i] = Math.min(255, Math.max(0, Math.round(r * ratio)));
            out[i + 1] = Math.min(255, Math.max(0, Math.round(g * ratio)));
            out[i + 2] = Math.min(255, Math.max(0, Math.round(b * ratio)));
          }
        }
      }

      octx.putImageData(outImg, 0, 0);

      setProcessingMsg("Gerando documento PDF A4 oficial...");
      const jpegDataUrl = outCanvas.toDataURL("image/jpeg", 0.92);

      const isLandscape = outW > outH;
      const pdf = new jsPDF({
        orientation: isLandscape ? "l" : "p",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const imgRatio = outW / outH;
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
      const file = new File(
        [pdfBlob],
        `documento-digitalizado-PB-${Date.now()}.pdf`,
        { type: "application/pdf", lastModified: Date.now() }
      );

      onDone(file, jpegDataUrl);
    } catch (err) {
      console.error("Erro no processamento do scanner:", err);
    } finally {
      setProcessing(false);
      setProcessingMsg("");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black flex flex-col select-none touch-none"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        {/* Barra Superior */}
        <div className="flex items-center justify-between px-3 py-2.5 text-white bg-black/80 backdrop-blur z-10 border-b border-white/10">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Seletor de Modo: P&B (Padrão) vs Colorido */}
          {imgSrc && (
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setFilterMode("bw")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === "bw"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                P&B Nítido
              </button>
              <button
                onClick={() => setFilterMode("color")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === "color"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Colorido
              </button>
            </div>
          )}

          {imgSrc ? (
            <div className="flex items-center gap-1">
              <button
                onClick={rotate90}
                className="p-2 hover:bg-white/10 rounded-full text-white/90 transition-colors"
                title="Girar documento 90°"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={selectAll}
                className="p-2 hover:bg-white/10 rounded-full text-white/90 transition-colors"
                title="Selecionar folha inteira"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={resetCorners}
                className="p-2 hover:bg-white/10 rounded-full text-white/90 transition-colors"
                title="Redefinir cantos padrão"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Área Central / Visualização */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden relative bg-neutral-950 p-2"
        >
          {!imgSrc ? (
            <div className="flex flex-col items-center gap-4 text-white/80 p-6 text-center max-w-xs">
              <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-2">
                <Camera className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg text-white">Scanner de Documentos</h3>
              <p className="text-xs text-white/60">
                Tire a foto da folha. O sistema cortará as bordas e digitalizará em Preto e Branco nítido em PDF A4.
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  Tirar Foto da Folha
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                >
                  <ImageIcon className="w-4 h-4" />
                  Escolher da Galeria
                </button>
              </div>
            </div>
          ) : (
            <div
              className="relative touch-none"
              style={{ width: displaySize.w, height: displaySize.h }}
              onPointerMove={onPointerMove}
              onPointerUp={() => setDragging(null)}
              onPointerLeave={() => setDragging(null)}
            >
              <img
                src={imgSrc}
                alt="Documento capturado"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />

              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                preserveAspectRatio="none"
              >
                {corners.length === 4 && (
                  <polygon
                    points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(59, 130, 246, 0.22)"
                    stroke="#3b82f6"
                    strokeWidth={Math.max(3, imgSize.w / 350)}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>

              {corners.map((p, i) => (
                <div
                  key={i}
                  onPointerDown={(e) => {
                    (e.currentTarget as HTMLDivElement).setPointerCapture(
                      e.pointerId
                    );
                    setDragging(i);
                  }}
                  className={`absolute w-9 h-9 -ml-[18px] -mt-[18px] rounded-full border-2 border-white shadow-2xl flex items-center justify-center touch-none transition-transform ${
                    dragging === i
                      ? "bg-blue-600 scale-125 ring-4 ring-blue-400/50"
                      : "bg-blue-500 hover:scale-110"
                  }`}
                  style={{ left: p.x * scale, top: p.y * scale }}
                >
                  <div className="w-2.5 h-2.5 bg-white rounded-full pointer-events-none" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barra Inferior */}
        {imgSrc && (
          <div className="p-4 bg-black/90 backdrop-blur border-t border-white/10 flex flex-col gap-2">
            {processing && (
              <div className="flex items-center justify-center gap-2 text-primary text-xs font-semibold py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{processingMsg}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Tirar Outra
              </button>

              <button
                onClick={confirm}
                disabled={processing}
                className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all shadow-lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando PDF A4...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Gerar PDF P&B A4</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentScanner;
