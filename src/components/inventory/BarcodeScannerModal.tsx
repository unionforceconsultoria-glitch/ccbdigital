import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, AlertCircle } from "lucide-react";

interface BarcodeScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2, 8)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode(containerId.current, { formatsToSupport: FORMATS, verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!active || scannedRef.current) return;
          scannedRef.current = true;
          scanner.stop().catch(() => {}).finally(() => {
            onScan(decodedText.trim());
          });
        },
        () => {
          /* ignora frames sem leitura */
        },
      )
      .catch((err) => {
        if (!active) return;
        console.error("Erro câmera:", err);
        setError("Não foi possível abrir a câmera. Verifique a permissão do navegador ou use a busca manual.");
      });

    return () => {
      active = false;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-card rounded-2xl overflow-hidden card-shadow-lg">
        <div className="bg-primary px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground font-bold text-sm">
            <Camera className="w-5 h-5" />
            Leitura de Etiqueta (QR / Código de Barras)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-foreground/80 hover:text-primary-foreground p-1"
            aria-label="Fechar leitor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div
                id={containerId.current}
                className="w-full rounded-xl overflow-hidden bg-foreground/10 min-h-[260px]"
              />
              <p className="text-xs text-muted-foreground text-center">
                Aponte a câmera para o QR Code ou código de barras da etiqueta patrimonial.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full touch-target bg-secondary text-foreground font-bold rounded-xl text-sm"
          >
            FECHAR CÂMERA
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;