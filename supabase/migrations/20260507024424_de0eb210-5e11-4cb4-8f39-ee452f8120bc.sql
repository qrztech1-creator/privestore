
-- Linhas (collections) - agrupamento acima de categorias
CREATE TABLE public.product_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lines readable by all" ON public.product_lines FOR SELECT USING (true);
CREATE POLICY "admin manage lines" ON public.product_lines FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.products ADD COLUMN line_id UUID REFERENCES public.product_lines(id) ON DELETE SET NULL;
CREATE INDEX idx_products_line ON public.products(line_id);
