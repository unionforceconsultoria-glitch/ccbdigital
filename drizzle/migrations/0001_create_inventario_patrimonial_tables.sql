CREATE TABLE public.inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id INTEGER NOT NULL,
  igreja_nome TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  tipo_procedimento TEXT NOT NULL DEFAULT 'semestral' CHECK (tipo_procedimento IN ('semestral', 'anual')),
  data_inventario DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido')),
  pdf_original_url TEXT,
  pdf_original_nome TEXT,
  relatorio_final_url TEXT,
  arquivado_documentos BOOLEAN NOT NULL DEFAULT false,
  envio_documento_id UUID,
  dados_extraidos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  resumo_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventarios TO anon, authenticated;
GRANT ALL ON public.inventarios TO service_role;

ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App can view inventarios"
  ON public.inventarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "App can insert inventarios"
  ON public.inventarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(igreja_nome)) >= 1
    AND length(btrim(igreja_nome)) <= 200
    AND length(btrim(responsavel)) >= 2
    AND length(btrim(responsavel)) <= 120
  );

CREATE POLICY "App can update inventarios"
  ON public.inventarios FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    length(btrim(igreja_nome)) >= 1
    AND length(btrim(responsavel)) >= 2
  );

CREATE POLICY "App can delete inventarios"
  ON public.inventarios FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_inventarios_igreja_id ON public.inventarios (igreja_id);
CREATE INDEX idx_inventarios_data ON public.inventarios (data_inventario DESC);

CREATE TRIGGER update_inventarios_updated_at
  BEFORE UPDATE ON public.inventarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventario_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  codigo_patrimonial TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  localizacao TEXT,
  grupo_chave TEXT NOT NULL,
  quantidade_esperada INTEGER NOT NULL DEFAULT 1 CHECK (quantidade_esperada >= 1),
  quantidade_encontrada INTEGER CHECK (quantidade_encontrada IS NULL OR quantidade_encontrada >= 0),
  status_conferencia TEXT NOT NULL DEFAULT 'pendente' CHECK (status_conferencia IN ('pendente', 'encontrado', 'nao_encontrado', 'divergencia')),
  status_etiqueta TEXT NOT NULL DEFAULT 'presente_legivel' CHECK (status_etiqueta IN ('presente_legivel', 'ausente', 'danificada', 'ilegivel', 'necessita_substituicao')),
  metodo_conferencia TEXT CHECK (metodo_conferencia IS NULL OR metodo_conferencia IN ('quantidade', 'etiqueta', 'manual')),
  observacoes TEXT,
  conferido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_itens TO anon, authenticated;
GRANT ALL ON public.inventario_itens TO service_role;

ALTER TABLE public.inventario_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App can view inventario_itens"
  ON public.inventario_itens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "App can insert inventario_itens"
  ON public.inventario_itens FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(btrim(descricao)) >= 1);

CREATE POLICY "App can update inventario_itens"
  ON public.inventario_itens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (length(btrim(descricao)) >= 1);

CREATE POLICY "App can delete inventario_itens"
  ON public.inventario_itens FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_inventario_itens_inv_id ON public.inventario_itens (inventario_id);
CREATE INDEX idx_inventario_itens_grupo ON public.inventario_itens (inventario_id, grupo_chave);
CREATE UNIQUE INDEX idx_inventario_itens_codigo_unico
  ON public.inventario_itens (inventario_id, lower(btrim(codigo_patrimonial)))
  WHERE codigo_patrimonial IS NOT NULL AND btrim(codigo_patrimonial) <> '';

CREATE TRIGGER update_inventario_itens_updated_at
  BEFORE UPDATE ON public.inventario_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventario_bens_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  codigo_patrimonial TEXT,
  localizacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_bens_extras TO anon, authenticated;
GRANT ALL ON public.inventario_bens_extras TO service_role;

ALTER TABLE public.inventario_bens_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App can view inventario_bens_extras"
  ON public.inventario_bens_extras FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "App can insert inventario_bens_extras"
  ON public.inventario_bens_extras FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(btrim(descricao)) >= 1 AND quantidade >= 1);

CREATE POLICY "App can update inventario_bens_extras"
  ON public.inventario_bens_extras FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (length(btrim(descricao)) >= 1 AND quantidade >= 1);

CREATE POLICY "App can delete inventario_bens_extras"
  ON public.inventario_bens_extras FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_inventario_bens_extras_inv_id ON public.inventario_bens_extras (inventario_id);

CREATE TABLE public.inventario_historico_alteracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  detalhes TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventario_historico_alteracoes TO anon, authenticated;
GRANT ALL ON public.inventario_historico_alteracoes TO service_role;

ALTER TABLE public.inventario_historico_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App can view inventario_historico_alteracoes"
  ON public.inventario_historico_alteracoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "App can insert inventario_historico_alteracoes"
  ON public.inventario_historico_alteracoes FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(btrim(acao)) >= 1);

CREATE INDEX idx_inventario_hist_inv_id ON public.inventario_historico_alteracoes (inventario_id, created_at DESC);