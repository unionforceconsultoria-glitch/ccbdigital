import React, { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RotateCw, Loader2, FileText, Maximize } from "lucide-react";

interface Props {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  cropPixels: Area,
  rotation: number,
  fileName: string
): Promise<File> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const rotRad = (rotation * Math.PI) / 180;
  // Bounding box of rotated image
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Extract cropped area
  const data = ctx.getImageData(cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height);
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  ctx.putImageData(data, 0, 0);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Falha ao gerar imagem"));
        resolve(new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      0.85
    );
  });
};

const ImageCropper: React.FC<Props> = ({ open, file, onClose, onConfirm }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  // A4 aspect (retrato): 210/297 ≈ 0.7071. Padrão A4 para ajudar a enquadrar.
  const A4_PORTRAIT = 210 / 297;
  const A4_LANDSCAPE = 297 / 210;
  type AspectMode = "a4-portrait" | "a4-landscape" | "free";
  const [aspectMode, setAspectMode] = useState<AspectMode>("a4-portrait");
  const aspect =
    aspectMode === "a4-portrait"
      ? A4_PORTRAIT
      : aspectMode === "a4-landscape"
      ? A4_LANDSCAPE
      : undefined;

  React.useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectMode("a4-portrait");
  }, [file, open]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !file) return;
    try {
      setProcessing(true);
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, file.name);
      onConfirm(cropped);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
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
          <button onClick={onClose} className="p-2 -ml-2" aria-label="Fechar">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-sm">Recortar foto</h2>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 -mr-2"
            aria-label="Girar"
          >
            <RotateCw className="w-6 h-6" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 relative bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              showGrid={true}
            />
          )}
        </div>

        {/* Hint */}
        <div className="bg-black/80 text-white text-xs text-center px-4 py-2">
          Enquadre a folha dentro da moldura • Arraste para mover • Pince para aproximar
        </div>

        {/* Aspect selector */}
        <div className="bg-black/80 px-4 pt-2 pb-1 flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => setAspectMode("a4-portrait")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              aspectMode === "a4-portrait"
                ? "bg-white text-black"
                : "bg-white/15 text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            A4 em pé
          </button>
          <button
            type="button"
            onClick={() => setAspectMode("a4-landscape")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              aspectMode === "a4-landscape"
                ? "bg-white text-black"
                : "bg-white/15 text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5 rotate-90" />
            A4 deitado
          </button>
          <button
            type="button"
            onClick={() => setAspectMode("free")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              aspectMode === "free"
                ? "bg-white text-black"
                : "bg-white/15 text-white"
            }`}
          >
            <Maximize className="w-3.5 h-3.5" />
            Livre
          </button>
        </div>

        {/* Zoom slider */}
        <div className="bg-black/80 px-6 py-3">
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-white"
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/80 flex items-center justify-around">
          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1 text-white text-xs"
          >
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
              <X className="w-5 h-5" />
            </div>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex flex-col items-center gap-1 text-white text-xs disabled:opacity-60"
          >
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
              {processing ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Check className="w-7 h-7 text-white" />
              )}
            </div>
            Usar foto
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageCropper;