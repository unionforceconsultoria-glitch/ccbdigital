import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MessageCircle, RefreshCw, Copy, ChevronDown, Check } from "lucide-react";
import { useEnvios, useIgrejas, getMesAnterior } from "@/lib/storage";

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const getYears = () => {
  const c = new Date().getFullYear();
  return [c - 1, c, c + 1];
};

const TEMPLATE_DEFAULT = (mesLabel: string, ano: string, lista: string) =>
  `🙏 *Patrimônio CCB Digital*\n\nPaz de Deus, irmãos!\n\nConstam pendentes o envio do formulário mensal de *${mesLabel}/${ano}* das seguintes igrejas:\n\n${lista}\n\nPor gentileza, providenciem o envio o quanto antes pelo aplicativo.\n\nDeus abençoe! 🕊️`;

const AdminCobranca: React.FC = () => {
  const { data: envios = [] } = useEnvios();
  const { data: igrejas = [] } = useIgrejas();
  const mesAtualDefault = getMesAnterior();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDefault);
  const [mensagem, setMensagem] = useState("");
  const [copied, setCopied] = useState(false);
  const [agruparPorDist, setAgruparPorDist] = useState(true);

  const [anoStr, mesStr] = mesSelecionado.split("-");
  const mesLabel = meses.find((m) => m.value === mesStr)?.label || mesStr;

  const igrejasPendentes = useMemo(() => {
    const enviadas = new Set(
      envios.filter((e) => e.mes_referencia === mesSelecionado).map((e) => e.igreja_id)
    );
    return igrejas.filter((i) => !enviadas.has(i.id));
  }, [envios, igrejas, mesSelecionado]);

  const gerarMensagem = () => {
    if (igrejasPendentes.length === 0) {
      setMensagem(
        `🎉 *Patrimônio CCB Digital*\n\nTodas as igrejas já enviaram o formulário de *${mesLabel}/${anoStr}*!\n\nObrigado pela colaboração. Deus abençoe! 🙏`
      );
      return;
    }

    let lista = "";
    if (agruparPorDist) {
      const grupos = new Map<string, string[]>();
      igrejasPendentes.forEach((i) => {
        if (!grupos.has(i.distribuicao)) grupos.set(i.distribuicao, []);
        grupos.get(i.distribuicao)!.push(i.nome);
      });
      lista = [...grupos.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
        .map(
          ([dist, nomes]) =>
            `*${dist}*\n${nomes
              .sort((a, b) => a.localeCompare(b, "pt-BR"))
              .map((n) => `• ${n}`)
              .join("\n")}`
        )
        .join("\n\n");
    } else {
      lista = igrejasPendentes
        .map((i) => `• ${i.nome}`)
        .join("\n");
    }

    setMensagem(TEMPLATE_DEFAULT(mesLabel, anoStr, lista));
  };

  const copiar = async () => {
    if (!mensagem) return;
    await navigator.clipboard.writeText(mensagem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enviarWhatsApp = () => {
    if (!mensagem) return;
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-2xl card-shadow p-4">
        <h3 className="font-bold text-primary flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5" />
          Cobrança via WhatsApp
        </h3>

        <label className="text-xs font-semibold text-muted-foreground mb-2 block">
          Mês de Referência
        </label>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <select
              value={mesStr}
              onChange={(e) => setMesSelecionado(`${anoStr}-${e.target.value}`)}
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative w-28">
            <select
              value={anoStr}
              onChange={(e) => setMesSelecionado(`${e.target.value}-${mesStr}`)}
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 text-sm appearance-none cursor-pointer"
            >
              {getYears().map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agruparPorDist}
            onChange={(e) => setAgruparPorDist(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Agrupar por distribuição
        </label>

        <div className="bg-secondary rounded-xl p-3 mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Pendentes em {mesLabel}/{anoStr}</p>
            <p className="text-2xl font-bold text-destructive tabular-nums">
              {igrejasPendentes.length}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={gerarMensagem}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Gerar mensagem
          </motion.button>
        </div>

        <label className="text-xs font-semibold text-muted-foreground mb-2 block">
          Mensagem (editável)
        </label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder='Clique em "Gerar mensagem" para listar automaticamente as igrejas pendentes do mês selecionado.'
          rows={12}
          className="w-full px-3 py-2 rounded-xl bg-secondary border border-input text-sm font-mono resize-y"
        />

        <div className="flex gap-2 mt-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={copiar}
            disabled={!mensagem}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground py-2.5 rounded-xl text-sm font-bold hover:bg-muted transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={enviarWhatsApp}
            disabled={!mensagem}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AdminCobranca;
