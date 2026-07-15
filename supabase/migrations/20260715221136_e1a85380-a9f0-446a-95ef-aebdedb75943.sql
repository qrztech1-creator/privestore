
-- ============================================================
-- Loja pública CF: pedidos separados, favoritos e lista de espera
-- Estoque compartilhado com product_variants.stock (fonte única)
-- ============================================================

-- 1. Pedidos da loja
CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  address_line TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|paid|shipped|delivered|cancelled
  payment_provider TEXT,
  payment_session_id TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;
GRANT INSERT ON public.shop_orders TO anon; -- guest checkout
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers see own shop orders" ON public.shop_orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage shop orders" ON public.shop_orders
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "anyone create shop order" ON public.shop_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "customer updates own pending order" ON public.shop_orders
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid());

-- 2. Itens do pedido da loja
CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shop_order_items TO authenticated;
GRANT INSERT ON public.shop_order_items TO anon;
GRANT ALL ON public.shop_order_items TO service_role;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own shop order items" ON public.shop_order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "insert shop order items for own order" ON public.shop_order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = order_id));
CREATE POLICY "admins manage shop order items" ON public.shop_order_items
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Reaproveitar triggers de estoque no shop_order_items
CREATE TRIGGER shop_bump_variant_stock
  AFTER INSERT ON public.shop_order_items
  FOR EACH ROW EXECUTE FUNCTION public.bump_variant_stock();
CREATE TRIGGER shop_unbump_variant_stock
  AFTER DELETE ON public.shop_order_items
  FOR EACH ROW EXECUTE FUNCTION public.unbump_variant_stock();

-- 3. Favoritos
CREATE TABLE public.shop_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.shop_favorites TO authenticated;
GRANT ALL ON public.shop_favorites TO service_role;
ALTER TABLE public.shop_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own favorites" ON public.shop_favorites
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Lista de espera (avise-me quando chegar)
CREATE TABLE public.shop_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email, product_id, variant_id)
);
GRANT SELECT, INSERT, DELETE ON public.shop_waitlist TO authenticated;
GRANT INSERT ON public.shop_waitlist TO anon;
GRANT ALL ON public.shop_waitlist TO service_role;
ALTER TABLE public.shop_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own waitlist" ON public.shop_waitlist
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "anon join waitlist" ON public.shop_waitlist
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "admins see all waitlist" ON public.shop_waitlist
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Trigger de reposição: quando stock passa de 0 → >0, marca waitlist como pendente de notificação
CREATE OR REPLACE FUNCTION public.on_variant_restock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.stock IS NOT NULL AND OLD.stock <= 0)
     AND (NEW.stock IS NOT NULL AND NEW.stock > 0) THEN
    -- Reseta notified_at pra permitir novo envio (a fila de emails ler quem tem notified_at IS NULL)
    UPDATE public.shop_waitlist
       SET notified_at = NULL
     WHERE variant_id = NEW.id AND notified_at IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_variant_restock
  AFTER UPDATE OF stock ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.on_variant_restock();

-- 6. Função pública pra listar catálogo (produtos ativos com variantes/imagens)
CREATE OR REPLACE FUNCTION public.get_shop_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
    SELECT
      p.id, p.name, p.description, p.price, p.image_url, p.category, p.category_id, p.line_id,
      (SELECT c.name FROM categories c WHERE c.id = p.category_id) AS category_name,
      (SELECT l.name FROM product_lines l WHERE l.id = p.line_id) AS line_name,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', v.id, 'color_name', v.color_name, 'color_hex', v.color_hex,
        'size', v.size, 'stock', v.stock, 'price_override', v.price_override
      ) ORDER BY v.position) FROM product_variants v WHERE v.product_id = p.id), '[]'::jsonb) AS variants,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'url', i.url, 'color_name', i.color_name
      ) ORDER BY i.position) FROM product_images i WHERE i.product_id = p.id), '[]'::jsonb) AS images
    FROM products p
    WHERE p.active = true
    ORDER BY p.name
  ) x
$$;
GRANT EXECUTE ON FUNCTION public.get_shop_catalog() TO anon, authenticated;

-- 7. updated_at trigger em shop_orders
CREATE OR REPLACE FUNCTION public.update_shop_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_shop_orders_updated
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_shop_orders_updated_at();
