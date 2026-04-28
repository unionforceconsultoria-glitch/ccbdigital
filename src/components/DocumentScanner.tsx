import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, RotateCcw, Check, Loader2, Sparkles, Sun, FileImage } from "lucide-react";

// OpenCV.js types are loose; we cast to any
declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

const OPENCV_URL = "https://docs.opencv.org/4.8.0/opencv.js";

type Point = { x: number; y: number };

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

type FilterMode = "color" | "enhanced" | "bw";

let opencvLoadingPromise: Promise<void> | null = null;
const loadOpenCV = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject("no window");
  if (window.cv && window.cv.Mat) return Promise.resolve();
  if (opencvLoadingPromise) return opencvLoadingPromise;

  opencvLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${OPENCV_URL}"]`) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = () => {
      const check = () => {
        if (window.cv && window.cv.Mat) {
          resolve();
        } else if (window.cv && typeof window.cv["onRuntimeInitialized"] !== "undefined") {
          window.cv["onRuntimeInitialized"] = () => resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    script.onerror = () => reject(new Error("Falha ao carregar OpenCV"));
    if (!existing) document.body.appendChild(script);
  });
  return opencvLoadingPromise;
};

// Check if a quadrilateral is approximately convex and well-shaped
const isGoodQuad = (pts: Point[], imgW: number, imgH: number): boolean => {
  const ordered = orderPoints(pts);
  const [tl, tr, br, bl] = ordered;
  const w1 = distance(tl, tr);
  const w2 = distance(bl, br);
  const h1 = distance(tl, bl);
  const h2 = distance(tr, br);
  if (w1 < imgW * 0.2 || w2 < imgW * 0.2) return false;
  if (h1 < imgH * 0.2 || h2 < imgH * 0.2) return false;
  // Sides should be roughly parallel (similar lengths)
  const wRatio = Math.min(w1, w2) / Math.max(w1, w2);
  const hRatio = Math.min(h1, h2) / Math.max(h1, h2);
  if (wRatio < 0.6 || hRatio < 0.6) return false;
  // Check convexity via cross products
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % 4];
    const c = ordered[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (i === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
};

// Find largest 4-point contour. Tries multiple preprocessing strategies for robustness.
const findDocumentCorners = (src: any): Point[] | null => {
  const cv = window.cv;
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  let best: { pts: Point[]; area: number } | null = null;
  const imgArea = src.rows * src.cols;
  const imgW = src.cols;
  const imgH = src.rows;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Generate multiple edge maps to handle varying lighting / contrast
    const edgeMaps: any[] = [];

    // 1) Adaptive Canny based on median
    const data = blurred.data;
    let sum = 0;
    const sample = Math.min(data.length, 5000);
    const step = Math.max(1, Math.floor(data.length / sample));
    let count = 0;
    for (let i = 0; i < data.length; i += step) {
      sum += data[i];
      count++;
    }
    const mean = sum / count;
    const lower = Math.max(0, Math.floor(0.66 * mean));
    const upper = Math.min(255, Math.floor(1.33 * mean));
    const e1 = new cv.Mat();
    cv.Canny(blurred, e1, lower, upper);
    edgeMaps.push(e1);

    // 2) Fixed wide-range Canny (fallback)
    const e2 = new cv.Mat();
    cv.Canny(blurred, e2, 30, 100);
    edgeMaps.push(e2);

    // 3) Adaptive threshold (works well when document is white on dark)
    const e3 = new cv.Mat();
    cv.adaptiveThreshold(blurred, e3, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 10);
    edgeMaps.push(e3);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));

    for (const edges of edgeMaps) {
      // Close gaps in edges
      cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
      cv.dilate(edges, edges, kernel);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      // Collect contours sorted by area desc, examine top 10
      const candidates: { cnt: any; area: number }[] = [];
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > imgArea * 0.1) candidates.push({ cnt, area });
        else cnt.delete();
      }
      candidates.sort((a, b) => b.area - a.area);
      const top = candidates.slice(0, 10);
      const rest = candidates.slice(10);
      rest.forEach((c) => c.cnt.delete());

      for (const { cnt, area } of top) {
        const peri = cv.arcLength(cnt, true);
        // Try multiple epsilons to find a 4-point approximation
        for (const eps of [0.02, 0.03, 0.04, 0.05, 0.06, 0.08]) {
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, eps * peri, true);
          if (approx.rows === 4) {
            const pts: Point[] = [];
            for (let j = 0; j < 4; j++) {
              pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
            }
            approx.delete();
            if (isGoodQuad(pts, imgW, imgH)) {
              if (!best || area > best.area) best = { pts, area };
              break;
            }
          } else {
            approx.delete();
          }
        }
        cnt.delete();
      }

      contours.delete();
      hierarchy.delete();
      if (best) break; // good enough
    }

    edgeMaps.forEach((m) => m.delete());
    kernel.delete();
  } catch (err) {
    console.error("findDocumentCorners error", err);
  } finally {
    gray.delete();
    blurred.delete();
  }
  return best ? best.pts : null;
};

// Order 4 points: top-left, top-right, bottom-right, bottom-left
const orderPoints = (pts: Point[]): Point[] => {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Apply perspective transform and return canvas
const warpDocument = (srcCanvas: HTMLCanvasElement, corners: Point[]): HTMLCanvasElement => {
  const cv = window.cv;
  const src = cv.imread(srcCanvas);
  const ordered = orderPoints(corners);
  const [tl, tr, br, bl] = ordered;

  const widthA = distance(br, bl);
  const widthB = distance(tr, tl);
  const maxWidth = Math.max(widthA, widthB);

  const heightA = distance(tr, br);
  const heightB = distance(tl, bl);
  const maxHeight = Math.max(heightA, heightB);

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1,
  ]);

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight));

  const out = document.createElement("canvas");
  out.width = maxWidth;
  out.height = maxHeight;
  cv.imshow(out, dst);

  src.delete();
  dst.delete();
  M.delete();
  srcTri.delete();
  dstTri.delete();
  return out;
};

const applyFilter = (canvas: HTMLCanvasElement, mode: FilterMode): HTMLCanvasElement => {
  const cv = window.cv;
  const src = cv.imread(canvas);
  const dst = new cv.Mat();
  const out = document.createElement("canvas");

  if (mode === "color") {
    // Slight contrast/brightness boost
    src.convertTo(dst, -1, 1.15, 10);
  } else if (mode === "enhanced") {
    // Color, stronger contrast and saturation
    const lab = new cv.Mat();
    cv.cvtColor(src, lab, cv.COLOR_RGBA2RGB);
    cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);
    const channels = new cv.MatVector();
    cv.split(lab, channels);
    const clahe = new cv.CLAHE(2.5, new cv.Size(8, 8));
    const lChannel = channels.get(0);
    const lOut = new cv.Mat();
    clahe.apply(lChannel, lOut);
    channels.set(0, lOut);
    cv.merge(channels, lab);
    cv.cvtColor(lab, dst, cv.COLOR_Lab2RGB);
    cv.cvtColor(dst, dst, cv.COLOR_RGB2RGBA);
    lab.delete();
    channels.delete();
    lChannel.delete();
    lOut.delete();
    clahe.delete();
  } else {
    // Black and white scan look
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(gray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
    cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
    gray.delete();
  }

  out.width = src.cols;
  out.height = src.rows;
  cv.imshow(out, dst);
  src.delete();
  dst.delete();
  return out;
};

const DocumentScanner: React.FC<Props> = ({ open, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCornersRef = useRef<Point[] | null>(null);

  const [opencvReady, setOpencvReady] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Carregando scanner...");
  const [phase, setPhase] = useState<"camera" | "preview">("camera");
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [filteredCanvas, setFilteredCanvas] = useState<HTMLCanvasElement | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("enhanced");
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  // Load OpenCV when modal opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setOpencvReady(false);
    setLoadingMsg("Carregando scanner...");
    loadOpenCV()
      .then(() => setOpencvReady(true))
      .catch((err) => {
        console.error(err);
        setError("Não foi possível carregar o scanner. Verifique sua conexão.");
      });
  }, [open]);

  // Start camera when ready
  const startCamera = useCallback(async () => {
    try {
      setLoadingMsg("Acessando câmera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, []);

  useEffect(() => {
    if (open && opencvReady && phase === "camera") {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
    };
  }, [open, opencvReady, phase, startCamera]);

  // Real-time edge detection loop
  useEffect(() => {
    if (!open || !opencvReady || phase !== "camera") return;
    const cv = window.cv;
    const tmpCanvas = document.createElement("canvas");

    const tick = () => {
      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      if (!video || !overlay || video.readyState < 2) {
        detectionRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        detectionRafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Downscale for performance
      const scale = 480 / Math.max(vw, vh);
      tmpCanvas.width = Math.round(vw * scale);
      tmpCanvas.height = Math.round(vh * scale);
      const tctx = tmpCanvas.getContext("2d");
      if (!tctx) {
        detectionRafRef.current = requestAnimationFrame(tick);
        return;
      }
      tctx.drawImage(video, 0, 0, tmpCanvas.width, tmpCanvas.height);

      let pts: Point[] | null = null;
      try {
        const src = cv.imread(tmpCanvas);
        pts = findDocumentCorners(src);
        src.delete();
      } catch (e) {
        // skip
      }

      // Draw overlay matching the rendered video size
      const rect = video.getBoundingClientRect();
      overlay.width = rect.width * window.devicePixelRatio;
      overlay.height = rect.height * window.devicePixelRatio;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;

      const ctx = overlay.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        if (pts && pts.length === 4) {
          // Map points from tmp canvas to overlay
          const sx = overlay.width / tmpCanvas.width;
          const sy = overlay.height / tmpCanvas.height;
          const ordered = orderPoints(pts);
          ctx.lineWidth = 4 * window.devicePixelRatio;
          ctx.strokeStyle = "rgba(34, 197, 94, 0.95)";
          ctx.fillStyle = "rgba(34, 197, 94, 0.18)";
          ctx.beginPath();
          ordered.forEach((p, i) => {
            const x = p.x * sx;
            const y = p.y * sy;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Corner dots
          ordered.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x * sx, p.y * sy, 8 * window.devicePixelRatio, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(34, 197, 94, 1)";
            ctx.fill();
          });
          // Save corners scaled to original video coordinates for capture
          lastCornersRef.current = ordered.map((p) => ({
            x: p.x / scale,
            y: p.y / scale,
          }));
          setDetected(true);
        } else {
          lastCornersRef.current = null;
          setDetected(false);
          // Draw an A4 guide frame to help user position the page
          const margin = 0.08;
          const gx = overlay.width * margin;
          const gy = overlay.height * margin;
          const gw = overlay.width * (1 - 2 * margin);
          const gh = overlay.height * (1 - 2 * margin);
          ctx.lineWidth = 3 * window.devicePixelRatio;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.setLineDash([12 * window.devicePixelRatio, 8 * window.devicePixelRatio]);
          ctx.strokeRect(gx, gy, gw, gh);
          ctx.setLineDash([]);
        }
      }

      detectionRafRef.current = requestAnimationFrame(tick);
    };

    detectionRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
    };
  }, [open, opencvReady, phase]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;
    const ctx = fullCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    let result: HTMLCanvasElement = fullCanvas;
    const corners = lastCornersRef.current;
    if (corners) {
      try {
        result = warpDocument(fullCanvas, corners);
      } catch (e) {
        console.error("warp failed, using full image", e);
      }
    }
    setPreviewCanvas(result);
    setFilteredCanvas(applyFilter(result, filterMode));
    setPhase("preview");

    // Stop camera while previewing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [filterMode]);

  // Re-apply filter when changing mode in preview
  useEffect(() => {
    if (phase !== "preview" || !previewCanvas) return;
    setFilteredCanvas(applyFilter(previewCanvas, filterMode));
  }, [filterMode, previewCanvas, phase]);

  const handleRetake = () => {
    setPreviewCanvas(null);
    setFilteredCanvas(null);
    setPhase("camera");
  };

  const handleConfirm = () => {
    const target = filteredCanvas ?? previewCanvas;
    if (!target) return;
    target.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `documento-escaneado-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCapture(file);
        // Reset state
        setPreviewCanvas(null);
        setFilteredCanvas(null);
        setPhase("camera");
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setPreviewCanvas(null);
    setFilteredCanvas(null);
    setPhase("camera");
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 text-white z-10">
          <button onClick={handleClose} className="p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-sm">
            {phase === "camera" ? "Escanear Documento" : "Pré-visualização"}
          </h2>
          <div className="w-10" />
        </div>

        {/* Body */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          {error && (
            <div className="text-white text-center p-6">
              <p className="mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white/20 rounded-lg"
              >
                Fechar
              </button>
            </div>
          )}

          {!error && !opencvReady && (
            <div className="text-white text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
              <p className="text-sm">{loadingMsg}</p>
              <p className="text-xs text-white/60 mt-1">Primeira vez pode demorar alguns segundos</p>
            </div>
          )}

          {!error && opencvReady && phase === "camera" && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="max-w-full max-h-full object-contain"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute pointer-events-none"
                style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              />
              {/* Helper hint */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                Posicione o documento dentro do quadro verde
              </div>
            </div>
          )}

          {!error && phase === "preview" && filteredCanvas && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3 overflow-auto">
              <img
                src={filteredCanvas.toDataURL("image/jpeg", 0.9)}
                alt="Pré-visualização"
                className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
              />
              {/* Filter selector */}
              <div className="flex gap-2 bg-black/50 p-2 rounded-xl">
                <button
                  onClick={() => setFilterMode("color")}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs ${
                    filterMode === "color" ? "bg-white text-black" : "text-white"
                  }`}
                >
                  <FileImage className="w-5 h-5" />
                  Original
                </button>
                <button
                  onClick={() => setFilterMode("enhanced")}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs ${
                    filterMode === "enhanced" ? "bg-white text-black" : "text-white"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  Realçado
                </button>
                <button
                  onClick={() => setFilterMode("bw")}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs ${
                    filterMode === "bw" ? "bg-white text-black" : "text-white"
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  Preto e Branco
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        {!error && opencvReady && (
          <div className="p-4 bg-black/80 flex items-center justify-around">
            {phase === "camera" ? (
              <>
                <div className="w-16" />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/40 flex items-center justify-center"
                  aria-label="Capturar"
                >
                  <Camera className="w-7 h-7 text-black" />
                </motion.button>
                <div className="w-16" />
              </>
            ) : (
              <>
                <button
                  onClick={handleRetake}
                  className="flex flex-col items-center gap-1 text-white text-xs"
                >
                  <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  Refazer
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex flex-col items-center gap-1 text-white text-xs"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  Usar foto
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentScanner;
