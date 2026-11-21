DROP POLICY IF EXISTS "Public can submit envios" ON public.envios;
CREATE POLICY "Public can submit valid envios" ON public.envios FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(igreja_nome)) BETWEEN 1 AND 200
  AND length(btrim(nome_responsavel)) BETWEEN 2 AND 120
  AND length(btrim(tipo_formulario)) BETWEEN 1 AND 120
  AND length(arquivo_nome) BETWEEN 1 AND 255
  AND mes_referencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  AND protocolo ~ '^CCB-[0-9]{4}-[0-9]{4}$'
  AND arquivo_url LIKE 'https://wypeqsycmckfmotjllpm.supabase.co/storage/v1/object/public/documentos/%'
);

DROP POLICY IF EXISTS "Anyone can upload documentos" ON storage.objects;
CREATE POLICY "Upload documentos to allowed folders" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] IN ('envios', 'admin')
  AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png','heic','heif','webp')
);