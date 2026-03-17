import React from "react";
import { motion } from "framer-motion";

interface ProtocolStampProps {
  protocolo: string;
}

const ProtocolStamp: React.FC<ProtocolStampProps> = ({ protocolo }) => {
  return (
    <motion.div
      initial={{ rotate: -5, scale: 0.8, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.4 }}
      className="inline-block mx-auto"
    >
      <div className="relative border-4 border-primary rounded-2xl px-8 py-6">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-3">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            Protocolo
          </span>
        </div>
        <p className="text-2xl font-bold text-primary tabular-nums tracking-wide">
          {protocolo}
        </p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background px-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            CCB Digital
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProtocolStamp;
