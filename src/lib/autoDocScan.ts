// Detecção automática de folha + correção de perspectiva usando OpenCV.js
// Carregado sob demanda para não pesar no bundle inicial.

let cvPromise: Promise<any> | null = null;

const OPENCV_URL = "https://docs.opencv.org/4.10.0/opencv.js";

function loadOpenCV(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window");
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve((window as any).cv);
  }
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-opencv]`) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.async = true;
      script.src = OPENCV_URL;
      script.setAttribute("data-opencv", "true");
      document.head.appendChild(script);
    }
    const checkReady = () => {
      const cv = (window as any).cv;
      if (cv && cv.Mat) return resolve(cv);
      if (cv && typeof cv.then === "function") {
        cv.then(() => resolve((window as any).cv)).catch(reject);
        return;
      }
      setTimeout(checkReady, 100);
    };
    script.addEventListener("load", checkReady);
    script.addEventListener("error", () => reject(new Error("Falha ao carregar OpenCV")));
    checkReady();
  });
  return cvPromise;
}

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function orderCorners(pts: { x: number; y: number }[]) {
  // Retorna [tl, tr, br, bl]
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bot[1], bot[0]];
}

/**
 * Detecta automaticamente a folha numa foto e devolve uma imagem recortada e
 * com perspectiva corrigida. Se não conseguir detectar, devolve null.
 */
export async function autoScanDocument(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  let cv: any;
  try {
    cv = await loadOpenCV();
  } catch (e) {
    console.warn("OpenCV não disponível", e);
    return null;
  }

  const img = await fileToImage(file);

  // Trabalha em escala reduzida para detectar bordas (mais rápido), depois
  // aplica a transformação na imagem em alta resolução.
  const MAX_PROC = 800;
  const scale = Math.min(1, MAX_PROC / Math.max(img.width, img.height));
  const procW = Math.round(img.width * scale);
  const procH = Math.round(img.height * scale);

  const procCanvas = document.createElement("canvas");
  procCanvas.width = procW;
  procCanvas.height = procH;
  procCanvas.getContext("2d")!.drawImage(img, 0, 0, procW, procH);

  const src = cv.imread(procCanvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edged = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  let bestQuad: { x: number; y: number }[] | null = null;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edged, 75, 200);
    // Dilata para fechar bordas quebradas
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edged, edged, kernel);
    kernel.delete();

    cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = procW * procH;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > imgArea * 0.2 && area > bestArea) {
          const pts: { x: number; y: number }[] = [];
          for (let r = 0; r < 4; r++) {
            pts.push({ x: approx.intAt(r, 0), y: approx.intAt(r, 1) });
          }
          bestQuad = pts;
          bestArea = area;
        }
      }
      approx.delete();
      cnt.delete();
    }
  } catch (e) {
    console.warn("Erro na detecção", e);
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edged.delete();
    contours.delete();
    hierarchy.delete();
  }

  if (!bestQuad) return null;

  // Reescala os pontos para a imagem original
  const ordered = orderCorners(bestQuad).map((p) => ({
    x: p.x / scale,
    y: p.y / scale,
  }));
  const [tl, tr, br, bl] = ordered;

  const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
  const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
  const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
  const dstW = Math.max(widthA, widthB);
  const dstH = Math.max(heightA, heightB);

  if (dstW < 100 || dstH < 100) return null;

  // Aplica warp na imagem em alta resolução
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = img.width;
  fullCanvas.height = img.height;
  fullCanvas.getContext("2d")!.drawImage(img, 0, 0);
  const fullSrc = cv.imread(fullCanvas);
  const dst = new cv.Mat();
  const dsize = new cv.Size(dstW, dstH);
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0, dstW, 0, dstW, dstH, 0, dstH,
  ]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  cv.warpPerspective(fullSrc, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  const outCanvas = document.createElement("canvas");
  outCanvas.width = dstW;
  outCanvas.height = dstH;
  cv.imshow(outCanvas, dst);

  fullSrc.delete();
  dst.delete();
  srcTri.delete();
  dstTri.delete();
  M.delete();

  return new Promise<File | null>((resolve) => {
    outCanvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null);
        resolve(
          new File([blob], file.name.replace(/\.[^.]+$/, "") + "_scan.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
        );
      },
      "image/jpeg",
      0.85
    );
  });
}

// Pré-carrega a biblioteca em background (chamar após login para já ter pronto)
export function preloadOpenCV() {
  loadOpenCV().catch(() => {});
}