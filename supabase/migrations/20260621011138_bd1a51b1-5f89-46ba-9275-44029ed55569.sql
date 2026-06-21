
-- ============================================================
-- 1. Public-safe wishlist read (works for public events OR with
--    a valid invite token OR with the event's manage_token).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_event_products_for_guest(_event_id uuid, _token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ev public.events;
  _allowed boolean := false;
BEGIN
  SELECT * INTO _ev FROM public.events WHERE id = _event_id;
  IF _ev IS NULL THEN RETURN '[]'::jsonb; END IF;

  IF _ev.visibility = 'public' THEN
    _allowed := true;
  ELSIF _token IS NOT NULL AND _token <> '' THEN
    IF _ev.manage_token IS NOT NULL AND _ev.manage_token = _token THEN
      _allowed := true;
    ELSIF EXISTS (SELECT 1 FROM public.event_invites WHERE event_id = _event_id AND token = _token) THEN
      _allowed := true;
    END IF;
  END IF;

  IF NOT _allowed THEN RETURN '[]'::jsonb; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x) ORDER BY x.position)
    FROM (
      SELECT
        ep.id, ep.event_id, ep.product_id, ep.desired_qty, ep.purchased_qty,
        ep.is_favorite, ep.position,
        jsonb_build_object(
          'id', p.id, 'name', p.name, 'price', p.price, 'image_url', p.image_url,
          'description', p.description, 'active', p.active,
          'variants', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', v.id, 'color_name', v.color_name, 'color_hex', v.color_hex,
              'size', v.size, 'stock', v.stock, 'price_override', v.price_override,
              'position', v.position
            ) ORDER BY v.position)
            FROM public.product_variants v WHERE v.product_id = p.id
          ), '[]'::jsonb),
          'images', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', i.id, 'url', i.url, 'color_name', i.color_name, 'position', i.position
            ) ORDER BY i.position)
            FROM public.product_images i WHERE i.product_id = p.id
          ), '[]'::jsonb)
        ) AS product
      FROM public.event_products ep
      JOIN public.products p ON p.id = ep.product_id
      WHERE ep.event_id = _event_id
      ORDER BY ep.position
    ) x
  ), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.get_event_products_for_guest(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_products_for_guest(uuid, text) TO anon, authenticated;

-- ============================================================
-- 2. Invite management via the bride's manage_token
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_invites_by_token(_token text)
RETURNS SETOF public.event_invites
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.* FROM public.event_invites i
  JOIN public.events e ON e.id = i.event_id
  WHERE e.manage_token = _token
  ORDER BY i.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.create_invite_by_token(_token text, _label text)
RETURNS public.event_invites
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _eid uuid;
  _row public.event_invites;
  _new_token text;
BEGIN
  SELECT id INTO _eid FROM public.events WHERE manage_token = _token;
  IF _eid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  _new_token := encode(gen_random_bytes(12), 'hex');
  INSERT INTO public.event_invites (event_id, token, guest_label)
    VALUES (_eid, _new_token, NULLIF(_label, ''))
    RETURNING * INTO _row;
  RETURN _row;
END $$;

CREATE OR REPLACE FUNCTION public.delete_invite_by_token(_token text, _invite_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _eid uuid;
BEGIN
  SELECT id INTO _eid FROM public.events WHERE manage_token = _token;
  IF _eid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  DELETE FROM public.event_invites WHERE id = _invite_id AND event_id = _eid;
END $$;

REVOKE ALL ON FUNCTION public.list_invites_by_token(text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invite_by_token(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_invite_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_invites_by_token(text)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite_by_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_invite_by_token(text, uuid) TO anon, authenticated;

-- ============================================================
-- 3. Variant stock reservation
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_variant_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.product_variants
       SET stock = GREATEST(0, stock - NEW.qty)
     WHERE id = NEW.variant_id AND stock IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.unbump_variant_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.variant_id IS NOT NULL THEN
    UPDATE public.product_variants
       SET stock = stock + OLD.qty
     WHERE id = OLD.variant_id AND stock IS NOT NULL;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_bump_variant_stock ON public.order_items;
CREATE TRIGGER trg_bump_variant_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.bump_variant_stock();

DROP TRIGGER IF EXISTS trg_unbump_variant_stock ON public.order_items;
CREATE TRIGGER trg_unbump_variant_stock
AFTER DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.unbump_variant_stock();

-- Extend the order-status sync trigger to also release / re-reserve variant stock
CREATE OR REPLACE FUNCTION public.sync_purchased_on_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT event_product_id, variant_id, qty FROM public.order_items WHERE order_id = NEW.id LOOP
      IF it.event_product_id IS NOT NULL THEN
        UPDATE public.event_products
           SET purchased_qty = GREATEST(0, purchased_qty - it.qty)
         WHERE id = it.event_product_id;
      END IF;
      IF it.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock = stock + it.qty
         WHERE id = it.variant_id AND stock IS NOT NULL;
      END IF;
    END LOOP;
  ELSIF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT event_product_id, variant_id, qty FROM public.order_items WHERE order_id = NEW.id LOOP
      IF it.event_product_id IS NOT NULL THEN
        UPDATE public.event_products
           SET purchased_qty = purchased_qty + it.qty
         WHERE id = it.event_product_id;
      END IF;
      IF it.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock = GREATEST(0, stock - it.qty)
         WHERE id = it.variant_id AND stock IS NOT NULL;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
