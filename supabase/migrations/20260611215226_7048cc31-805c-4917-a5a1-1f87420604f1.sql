
-- 1) Soft delete em eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events(archived_at);

-- 2) Variações de produto (cor + tamanho)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name text,
  color_hex text,
  size text,
  sku text,
  price_override numeric(10,2),
  stock integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants readable by all" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "admin manage variants" ON public.product_variants FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3) Galeria de fotos por produto (opcionalmente por cor)
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name text, -- nulo = aplica ao produto em geral
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_color ON public.product_images(product_id, color_name);

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images readable by all" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "admin manage images" ON public.product_images FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4) Order items: gravar variação escolhida
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_label text;

-- 5) Esconder eventos arquivados na política pública de SELECT
DROP POLICY IF EXISTS "public events readable" ON public.events;
CREATE POLICY "public events readable" ON public.events FOR SELECT
USING (
  archived_at IS NULL AND (
    visibility = 'public'::event_visibility
    OR auth.uid() = owner_id
    OR public.is_admin(auth.uid())
  )
  OR public.is_admin(auth.uid())  -- admin vê tudo, inclusive arquivados
);
