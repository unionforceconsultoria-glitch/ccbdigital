import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Calendar, FileText, User, Camera, Upload, CheckCircle2, HelpCircle } from "lucide-react";

const STORAGE_KEY = "ccb_tutorial_hidden_users";

const steps = [
  { icon: Building2, title: "1. Selecione sua Igreja", desc: "Escolha a igreja na lista suspensa." },
  { icon: Calendar, title: "2. Mês de Referência", desc: "Confirme o mês ao qual o documento se refere." },
  { icon: FileText, title: "3. Tipo de Formulário", desc: "Selecione o formulário que está enviando." },
  { icon: User, title: "4. Nome do Responsável", desc: "Digite seu nome completo." },
  { icon: Camera, title: "5. Anexar Documento", desc: "Tire uma foto ou escolha um arquivo do dispositivo." },
  { icon: CheckCircle2, title: "6. Enviar", desc: "Toque em ENVIAR DOCUMENTO e guarde o protocolo gerado." },
];

const getHiddenUsers = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const getOrCreateUserId = (): string => {
  const KEY = "ccb_user_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
};

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

const TutorialModal: React.FC<Props> = ({ forceOpen = false, onClose }) => {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const userId = getOrCreateUserId();

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    const hidden = getHiddenUsers();
    if (!hidden.includes(userId)) setOpen(true);
  }, [forceOpen, userId]);

  const handleClose = () => {
    if (dontShow) {
      const hidden = getHiddenUsers();
      if (!hidden.includes(userId)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden, userId]));
      }
    }
    setOpen(false);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <h2 className="font-bold text-base">Como enviar seu formulário</h2>
              </div>
              <button onClick={handleClose} className="p-1 hover:opacity-80" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Siga o passo a passo abaixo para enviar corretamente seu documento mensal.
              </p>
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 items-start bg-secondary/60 rounded-xl p-3"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="border-t border-border p-4 space-y-3 bg-background">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Não mostrar este tutorial novamente
              </label>
              <button
                onClick={handleClose}
                className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl"
              >
                ENTENDI
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialModal;