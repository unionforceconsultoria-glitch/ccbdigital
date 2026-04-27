-- Tabela para gerenciar igrejas customizadas (adicionadas/editadas via painel admin)
CREATE TABLE public.igrejas_custom (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  distribuicao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.igrejas_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view igrejas_custom"
ON public.igrejas_custom FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert igrejas_custom"
ON public.igrejas_custom FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update igrejas_custom"
ON public.igrejas_custom FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete igrejas_custom"
ON public.igrejas_custom FOR DELETE
USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_igrejas_custom_updated_at
BEFORE UPDATE ON public.igrejas_custom
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela opcional para marcar igrejas padrão como ocultadas/editadas (override)
CREATE TABLE public.igrejas_overrides (
  id INTEGER NOT NULL PRIMARY KEY,
  nome TEXT,
  distribuicao TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.igrejas_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view igrejas_overrides"
ON public.igrejas_overrides FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert igrejas_overrides"
ON public.igrejas_overrides FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update igrejas_overrides"
ON public.igrejas_overrides FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete igrejas_overrides"
ON public.igrejas_overrides FOR DELETE
USING (true);

CREATE TRIGGER update_igrejas_overrides_updated_at
BEFORE UPDATE ON public.igrejas_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();