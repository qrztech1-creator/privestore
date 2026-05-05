CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable by all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- seed common categories
INSERT INTO public.categories (name, slug, position) VALUES
  ('Lingerie', 'lingerie', 1),
  ('Camisolas', 'camisolas', 2),
  ('Robes', 'robes', 3),
  ('Acessórios', 'acessorios', 4),
  ('Sapatos', 'sapatos', 5),
  ('Bolsas', 'bolsas', 6)
ON CONFLICT (slug) DO NOTHING;