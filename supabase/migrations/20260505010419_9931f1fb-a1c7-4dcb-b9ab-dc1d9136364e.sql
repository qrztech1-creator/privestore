
-- Drop signup trigger (closed platform — only admin logs in)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add manage_token to events for bride access via secret link
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS manage_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS thank_you_message text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Backfill manage tokens for existing events
UPDATE public.events SET manage_token = encode(gen_random_bytes(24), 'hex') WHERE manage_token IS NULL;

-- Order tracking for Stripe
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Function: validate manage_token belongs to event
CREATE OR REPLACE FUNCTION public.event_for_token(_token text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.events WHERE manage_token = _token LIMIT 1
$$;

-- Allow public update on event when correct manage_token provided via RPC param
-- We expose dedicated RPCs instead of broad RLS to keep security tight.
CREATE OR REPLACE FUNCTION public.update_event_by_token(
  _token text,
  _patch jsonb
) RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eid uuid; _row public.events;
BEGIN
  SELECT id INTO _eid FROM public.events WHERE manage_token = _token;
  IF _eid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  UPDATE public.events SET
    bride_name = COALESCE(_patch->>'bride_name', bride_name),
    partner_name = COALESCE(_patch->>'partner_name', partner_name),
    event_date = COALESCE((_patch->>'event_date')::timestamptz, event_date),
    banner_url = COALESCE(_patch->>'banner_url', banner_url),
    message = COALESCE(_patch->>'message', message),
    playlist_url = COALESCE(_patch->>'playlist_url', playlist_url),
    whatsapp_number = COALESCE(_patch->>'whatsapp_number', whatsapp_number),
    thank_you_message = COALESCE(_patch->>'thank_you_message', thank_you_message),
    contact_email = COALESCE(_patch->>'contact_email', contact_email),
    contact_phone = COALESCE(_patch->>'contact_phone', contact_phone),
    palette = COALESCE((_patch->'palette')::jsonb, palette),
    visibility = COALESCE((_patch->>'visibility')::event_visibility, visibility),
    secret_code = COALESCE(_patch->>'secret_code', secret_code),
    updated_at = now()
  WHERE id = _eid RETURNING * INTO _row;
  RETURN _row;
END $$;

-- Manage event_products via token
CREATE OR REPLACE FUNCTION public.upsert_event_product_by_token(
  _token text, _product_id uuid, _desired_qty int, _is_favorite bool, _position int
) RETURNS public.event_products
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eid uuid; _row public.event_products;
BEGIN
  SELECT id INTO _eid FROM public.events WHERE manage_token = _token;
  IF _eid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  INSERT INTO public.event_products (event_id, product_id, desired_qty, is_favorite, position)
  VALUES (_eid, _product_id, COALESCE(_desired_qty,1), COALESCE(_is_favorite,false), COALESCE(_position,0))
  ON CONFLICT DO NOTHING
  RETURNING * INTO _row;
  IF _row.id IS NULL THEN
    UPDATE public.event_products SET
      desired_qty = COALESCE(_desired_qty, desired_qty),
      is_favorite = COALESCE(_is_favorite, is_favorite),
      position = COALESCE(_position, position)
    WHERE event_id=_eid AND product_id=_product_id RETURNING * INTO _row;
  END IF;
  RETURN _row;
END $$;

CREATE OR REPLACE FUNCTION public.remove_event_product_by_token(_token text, _ep_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eid uuid;
BEGIN
  SELECT id INTO _eid FROM public.events WHERE manage_token = _token;
  IF _eid IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  DELETE FROM public.event_products WHERE id=_ep_id AND event_id=_eid;
END $$;

-- Allow reading event by token (returns full event row even if private)
CREATE OR REPLACE FUNCTION public.get_event_by_token(_token text)
RETURNS public.events LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.events WHERE manage_token = _token LIMIT 1
$$;

-- Allow reading orders for an event by manage token
CREATE OR REPLACE FUNCTION public.get_orders_by_token(_token text)
RETURNS SETOF public.orders LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.* FROM public.orders o
  JOIN public.events e ON e.id = o.event_id
  WHERE e.manage_token = _token ORDER BY o.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.update_event_by_token(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_event_product_by_token(text, uuid, int, bool, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_event_product_by_token(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_orders_by_token(text) TO anon, authenticated;
