CREATE POLICY "Upload inventarios PDFs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'inventarios'
    AND lower(storage.extension(name)) = 'pdf'
  );