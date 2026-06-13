
-- 1. Roles infrastructure
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. First-user-becomes-admin trigger (one-time bootstrap)
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_first_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

-- 3. envios: keep public read+insert, restrict update/delete to admins
DROP POLICY IF EXISTS "Anyone can delete envios" ON public.envios;
DROP POLICY IF EXISTS "Anyone can insert envios" ON public.envios;
DROP POLICY IF EXISTS "Anyone can view envios" ON public.envios;

CREATE POLICY "Public can view envios"
ON public.envios FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can submit envios"
ON public.envios FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can update envios"
ON public.envios FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete envios"
ON public.envios FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. documentos_admin: public read; admin-only writes
DROP POLICY IF EXISTS "Anyone can delete documentos" ON public.documentos_admin;
DROP POLICY IF EXISTS "Anyone can insert documentos" ON public.documentos_admin;
DROP POLICY IF EXISTS "Anyone can view documentos" ON public.documentos_admin;

CREATE POLICY "Public can view documentos_admin"
ON public.documentos_admin FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert documentos_admin"
ON public.documentos_admin FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documentos_admin"
ON public.documentos_admin FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documentos_admin"
ON public.documentos_admin FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. igrejas_custom: public read; admin-only writes
DROP POLICY IF EXISTS "Anyone can delete igrejas_custom" ON public.igrejas_custom;
DROP POLICY IF EXISTS "Anyone can insert igrejas_custom" ON public.igrejas_custom;
DROP POLICY IF EXISTS "Anyone can update igrejas_custom" ON public.igrejas_custom;
DROP POLICY IF EXISTS "Anyone can view igrejas_custom" ON public.igrejas_custom;

CREATE POLICY "Public can view igrejas_custom"
ON public.igrejas_custom FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert igrejas_custom"
ON public.igrejas_custom FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update igrejas_custom"
ON public.igrejas_custom FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete igrejas_custom"
ON public.igrejas_custom FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. igrejas_overrides: public read; admin-only writes
DROP POLICY IF EXISTS "Anyone can delete igrejas_overrides" ON public.igrejas_overrides;
DROP POLICY IF EXISTS "Anyone can insert igrejas_overrides" ON public.igrejas_overrides;
DROP POLICY IF EXISTS "Anyone can update igrejas_overrides" ON public.igrejas_overrides;
DROP POLICY IF EXISTS "Anyone can view igrejas_overrides" ON public.igrejas_overrides;

CREATE POLICY "Public can view igrejas_overrides"
ON public.igrejas_overrides FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert igrejas_overrides"
ON public.igrejas_overrides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update igrejas_overrides"
ON public.igrejas_overrides FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete igrejas_overrides"
ON public.igrejas_overrides FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Storage: documentos bucket - keep public read+insert (so users can submit), restrict delete/update to admins
DROP POLICY IF EXISTS "Anyone can delete documentos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update documentos" ON storage.objects;

CREATE POLICY "Admins can delete documentos files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documentos files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin'));
