import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, X, RotateCcw, Loader2 } from "lucide-react";

type Point = { x: number; y: number };

/**
 * Resolve homografia 3x3 mapeando 4 pontos-origem para 4 pontos-destino.
 * Retorna matriz aplicável em (x,y) -> ( (h0 x + h1 y + h2)/(h6 x + h7 y + 1), ... )
 */
function computeHomography(src: Point[], dst: Point[]): number[] {
  // Monta sistema 8x8
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
  }
  // Gauss-Jordan
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    [M[i], M[piv]] = [M[piv], M[i]];
    const div = M[i][i] || 1e-9;
    for (let c = i; c <= n; c++) M[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  const h = M.map(r => r[n]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function orderCorners(pts: Point[]): Point[] {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bot[1], bot[0]]; // TL, TR, BR, BL
}

interface Props {
  onCancel: () => void;
  onDone: (file: File) => void;
}

const DocumentScanner: React.FC<Props> = ({ onCancel, onDone }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [corners, setCorners] = useState<Point[]>([]); // em coordenadas da imagem original
  const [dragging, setDragging] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  // Abre câmera imediatamente
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.click(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) { onCancel(); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSrc(url);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Corners padrão com 8% de margem
      const mx = img.naturalWidth * 0.08;
      const my = img.naturalHeight * 0.08;
      setCorners([
        { x: mx, y: my },
        { x: img.naturalWidth - mx, y: my },
        { x: img.naturalWidth - mx, y: img.naturalHeight - my },
        { x: mx, y: img.naturalHeight - my },
      ]);
    };
    img.src = url;
  };

  // Recalcula tamanho exibido
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
      if (h > maxH) { h = maxH; w = h * ratio; }
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
    setCorners(c => c.map((p, i) => (i === dragging ? clamped : p)));
  };

  const reset = () => {
    if (!imgSize.w) return;
    const mx = imgSize.w * 0.08;
    const my = imgSize.h * 0.08;
    setCorners([
      { x: mx, y: my },
      { x: imgSize.w - mx, y: my },
      { x: imgSize.w - mx, y: imgSize.h - my },
      { x: mx, y: imgSize.h - my },
    ]);
  };

  const confirm = async () => {
    if (!imgRef.current || corners.length !== 4) return;
    setProcessing(true);
    try {
      const ordered = orderCorners(corners);
      const [tl, tr, br, bl] = ordered;
      // Dimensões destino: média dos lados
      const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const widthBot = Math.hypot(br.x - bl.x, br.y - bl.y);
      const heightL = Math.hypot(bl.x - tl.x, bl.y - tl.y);
      const heightR = Math.hypot(br.x - tr.x, br.y - tr.y);
      let outW = Math.round(Math.max(widthTop, widthBot));
      let outH = Math.round(Math.max(heightL, heightR));
      // Limita tamanho para performance/tamanho de arquivo
      const MAX = 1600;
      if (outW > MAX || outH > MAX) {
        const r = Math.min(MAX / outW, MAX / outH);
        outW = Math.round(outW * r);
        outH = Math.round(outH * r);
      }
      // H mapeia destino -> origem (inverso), para amostrar
      const dstPts: Point[] = [
        { x: 0, y: 0 },
        { x: outW - 1, y: 0 },
        { x: outW - 1, y: outH - 1 },
        { x: 0, y: outH - 1 },
      ];
      const Hinv = computeHomography(dstPts, [tl, tr, br, bl]);

      // Canvas fonte
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = imgSize.w;
      srcCanvas.height = imgSize.h;
      const sctx = srcCanvas.getContext("2d")!;
      sctx.drawImage(imgRef.current, 0, 0);
      const srcData = sctx.getImageData(0, 0, imgSize.w, imgSize.h);
      const src = srcData.data;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const octx = outCanvas.getContext("2d")!;
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
            out[oi] = 255; out[oi + 1] = 255; out[oi + 2] = 255; out[oi + 3] = 255;
            continue;
          }
          // Amostragem bilinear
          const x0 = Math.floor(sx), y0 = Math.floor(sy);
          const dx = sx - x0, dy = sy - y0;
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

      // Realce (contraste + branqueamento do fundo) tipo CamScanner "colorido realçado"
      const contrast = 1.35;
      const brightness = 12;
      for (let i = 0; i < out.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = out[i + c];
          v = (v - 128) * contrast + 128 + brightness;
          if (v > 255) v = 255;
          if (v < 0) v = 0;
          out[i + c] = v;
        }
      }

      octx.putImageData(outImg, 0, 0);
      const blob: Blob = await new Promise((resolve) =>
        outCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82)
      );
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      onDone(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black flex flex-col"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <button onClick={onCancel} className="p-2" aria-label="Cancelar">
            <X className="w-6 h-6" />
          </button>
          <span className="font-semibold text-sm">
            {imgSrc ? "Ajuste os cantos" : "Abrindo câmera..."}
          </span>
          <button
            onClick={reset}
            disabled={!imgSrc}
            className="p-2 disabled:opacity-30"
            aria-label="Redefinir cantos"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Área da imagem */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden select-none"
        >
          {!imgSrc ? (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <Camera className="w-14 h-14" />
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-white/10 text-sm font-semibold"
              >
                Abrir câmera
              </button>
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
                alt="Documento"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              {/* SVG overlay */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                preserveAspectRatio="none"
              >
                {corners.length === 4 && (
                  <polygon
                    points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(59,130,246,0.15)"
                    stroke="#3b82f6"
                    strokeWidth={Math.max(2, imgSize.w / 400)}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {/* Handles */}
              {corners.map((p, i) => (
                <div
                  key={i}
                  onPointerDown={(e) => {
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    setDragging(i);
                  }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-white/90 border-2 border-blue-500 shadow-lg touch-none"
                  style={{ left: p.x * scale, top: p.y * scale }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {imgSrc && (
          <div className="px-4 py-4 flex gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={processing}
              className="flex-1 h-12 rounded-xl bg-white/10 text-white text-sm font-semibold disabled:opacity-50"
            >
              Nova foto
            </button>
            <button
              onClick={confirm}
              disabled={processing}
              className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Usar documento
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentScanner;