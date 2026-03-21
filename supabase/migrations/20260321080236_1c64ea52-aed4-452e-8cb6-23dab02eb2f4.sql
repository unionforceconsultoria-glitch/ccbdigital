
-- Create envios table
CREATE TABLE public.envios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  igreja_id INTEGER NOT NULL,
  igreja_nome TEXT NOT NULL,
  tipo_formulario TEXT NOT NULL,
  nome_responsavel TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mes_referencia TEXT NOT NULL,
  protocolo TEXT NOT NULL
);

-- Create documentos_admin table
CREATE TABLE public.documentos_admin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Outro',
  arquivo_url TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;

-- Public read/insert/delete for envios
CREATE POLICY "Anyone can view envios" ON public.envios FOR SELECT USING (true);
CREATE POLICY "Anyone can insert envios" ON public.envios FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete envios" ON public.envios FOR DELETE USING (true);

-- Public read/insert/delete for documentos
CREATE POLICY "Anyone can view documentos" ON public.documentos_admin FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documentos" ON public.documentos_admin FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete documentos" ON public.documentos_admin FOR DELETE USING (true);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Storage policies
CREATE POLICY "Public read documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
CREATE POLICY "Anyone can upload documentos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Anyone can delete documentos" ON storage.objects FOR DELETE USING (bucket_id = 'documentos');
