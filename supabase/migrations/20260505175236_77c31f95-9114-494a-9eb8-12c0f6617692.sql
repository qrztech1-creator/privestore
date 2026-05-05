
-- 1) Decrement purchased_qty when an order_item row is deleted
CREATE OR REPLACE FUNCTION public.unbump_purchased_qty()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.event_product_id IS NOT NULL THEN
    UPDATE public.event_products
       SET purchased_qty = GREATEST(0, purchased_qty - OLD.qty)
     WHERE id = OLD.event_product_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_unbump_purchased ON public.order_items;
CREATE TRIGGER trg_unbump_purchased
AFTER DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.unbump_purchased_qty();

-- 2) When order status changes to cancelled, decrement; when changes from cancelled back, increment
CREATE OR REPLACE FUNCTION public.sync_purchased_on_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it RECORD;
BEGIN
  -- moving INTO cancelled: release stock
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT event_product_id, qty FROM public.order_items WHERE order_id = NEW.id AND event_product_id IS NOT NULL LOOP
      UPDATE public.event_products
         SET purchased_qty = GREATEST(0, purchased_qty - it.qty)
       WHERE id = it.event_product_id;
    END LOOP;
  -- moving OUT of cancelled: re-reserve stock
  ELSIF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT event_product_id, qty FROM public.order_items WHERE order_id = NEW.id AND event_product_id IS NOT NULL LOOP
      UPDATE public.event_products
         SET purchased_qty = purchased_qty + it.qty
       WHERE id = it.event_product_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_purchased_on_status ON public.orders;
CREATE TRIGGER trg_sync_purchased_on_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_purchased_on_order_status();

-- 3) Team invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'admin',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage invites" ON public.team_invites
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4) When a new auth user signs up, auto-grant role from team_invites if there's a pending invite
CREATE OR REPLACE FUNCTION public.handle_new_user_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
BEGIN
  -- ensure profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- consume invite
  FOR inv IN SELECT * FROM public.team_invites WHERE email = NEW.email AND accepted_at IS NULL LOOP
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role)
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.team_invites SET accepted_at = now() WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invite();
