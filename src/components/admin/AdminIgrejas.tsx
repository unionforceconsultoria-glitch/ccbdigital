import React, { useState } from "react";
import { motion } from "framer-motion";
import { Church, Plus, Pencil, Trash2, X, Save, EyeOff, Eye } from "lucide-react";
import { igrejas as igrejasFixas, distribuicoes } from "@/data/churches";
import {
  useIgrejasCustom,
  useIgrejasOverrides,
  useAddIgrejaCustom,
  useUpdateIgrejaCustom,
  useRemoveIgrejaCustom,
  useUpsertIgrejaOverride,
  useRemoveIgrejaOverride,
} from "@/lib/storage";

type EditState =
  | { tipo: "fixa"; id: number; nome: string; distribuicao: string }
  | { tipo: "custom"; id: string; nome: string; distribuicao: string }
  | { tipo: "novo"; nome: string; distribuicao: string }
  | null;

const AdminIgrejas: React.FC = () => {
  const { data: customs = [] } = useIgrejasCustom();
  const { data: overrides = [] } = useIgrejasOverrides();
  const addCustom = useAddIgrejaCustom();
  const updateCustom = useUpdateIgrejaCustom();
  const removeCustom = useRemoveIgrejaCustom();
  const upsertOverride = useUpsertIgrejaOverride();
  const removeOverride = useRemoveIgrejaOverride();

  const [edit, setEdit] = useState<EditState>(null);

  const overridesMap = new Map(overrides.map((o) => [o.id, o]));

  const fixasView = igrejasFixas.map((i) => {
    const ov = overridesMap.get(i.id);
    return {
      id: i.id,
      nome: ov?.nome || i.nome,
      distribuicao: ov?.distribuicao || i.distribuicao,
      hidden: !!ov?.hidden,
      editado: !!(ov?.nome || ov?.distribuicao),
    };
  });

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.nome.trim() || !edit.distribuicao.trim()) return;

    try {
      if (edit.tipo === "novo") {
        await addCustom.mutateAsync({ nome: edit.nome.trim(), distribuicao: edit.distribuicao });
      } else if (edit.tipo === "custom") {
        await updateCustom.mutateAsync({
          id: edit.id,
          nome: edit.nome.trim(),
          distribuicao: edit.distribuicao,
        });
      } else if (edit.tipo === "fixa") {
        await upsertOverride.mutateAsync({
          id: edit.id,
          nome: edit.nome.trim(),
          distribuicao: edit.distribuicao,
          hidden: false,
        });
      }
      setEdit(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar igreja");
    }
  };

  const toggleHidden = async (id: number, currentHidden: boolean) => {
    await upsertOverride.mutateAsync({ id, hidden: !currentHidden });
  };

  const restaurar = async (id: number) => {
    if (!confirm("Restaurar valores originais desta igreja?")) return;
    await removeOverride.mutateAsync(id);
  };

  const removerCustom = async (id: string) => {
    if (!confirm("Excluir esta igreja? Esta ação não pode ser desfeita.")) return;
    await removeCustom.mutateAsync(id);
  };

  const fixasOrdenadas = [...fixasView].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  const customsOrdenadas = [...customs].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-2xl card-shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <Church className="w-5 h-5" />
            Gerenciar Igrejas
          </h3>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setEdit({ tipo: "novo", nome: "", distribuicao: distribuicoes[0] })}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova
          </motion.button>
        </div>

        {edit && (
          <div className="bg-secondary rounded-xl p-3 mb-3 space-y-2 border border-primary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">
                {edit.tipo === "novo" ? "Adicionar nova igreja" : "Editar igreja"}
              </span>
              <button onClick={() => setEdit(null)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nome da igreja"
              value={edit.nome}
              onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
            />
            <select
              value={edit.distribuicao}
              onChange={(e) => setEdit({ ...edit, distribuicao: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
            >
              {distribuicoes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold hover:brightness-110"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        )}

        {/* Customs */}
        {customsOrdenadas.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Igrejas adicionadas
            </p>
            <div className="space-y-1">
              {customsOrdenadas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.distribuicao}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() =>
                        setEdit({
                          tipo: "custom",
                          id: c.id,
                          nome: c.nome,
                          distribuicao: c.distribuicao,
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-background text-primary"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removerCustom(c.id)}
                      className="p-1.5 rounded-lg hover:bg-background text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixas */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Igrejas padrão
          </p>
          <div className="space-y-1">
            {fixasOrdenadas.map((i) => (
              <div
                key={i.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                  i.hidden ? "bg-secondary/40 opacity-60" : "bg-secondary"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {i.nome}
                    {i.editado && (
                      <span className="text-[10px] bg-accent/20 text-primary px-1.5 py-0.5 rounded">
                        editada
                      </span>
                    )}
                    {i.hidden && (
                      <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                        oculta
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{i.distribuicao}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() =>
                      setEdit({
                        tipo: "fixa",
                        id: i.id,
                        nome: i.nome,
                        distribuicao: i.distribuicao,
                      })
                    }
                    className="p-1.5 rounded-lg hover:bg-background text-primary"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleHidden(i.id, i.hidden)}
                    className="p-1.5 rounded-lg hover:bg-background text-muted-foreground"
                    title={i.hidden ? "Mostrar" : "Ocultar"}
                  >
                    {i.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {i.editado && (
                    <button
                      onClick={() => restaurar(i.id)}
                      className="p-1.5 rounded-lg hover:bg-background text-destructive"
                      title="Restaurar original"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIgrejas;
