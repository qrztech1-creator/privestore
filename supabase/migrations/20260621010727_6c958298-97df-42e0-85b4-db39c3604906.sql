
DROP POLICY IF EXISTS "public events readable" ON public.events;

CREATE POLICY "owner admin read events"
ON public.events
FOR SELECT
USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_event_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  type event_type,
  bride_name text,
  partner_name text,
  event_date timestamptz,
  banner_url text,
  message text,
  playlist_url text,
  whatsapp_number text,
  thank_you_message text,
  palette jsonb,
  visibility event_visibility,
  status event_status,
  archived_at timestamptz,
  owner_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.slug, e.type, e.bride_name, e.partner_name, e.event_date,
    e.banner_url, e.message, e.playlist_url, e.whatsapp_number,
    e.thank_you_message, e.palette, e.visibility, e.status,
    e.archived_at, e.owner_id
  FROM public.events e
  WHERE e.slug = _slug
    AND e.archived_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_event_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_event_by_slug(text) TO anon, authenticated;

DROP POLICY IF EXISTS "invites readable by token" ON public.event_invites;

CREATE OR REPLACE FUNCTION public.validate_invite_token(_event_id uuid, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_invites
    WHERE event_id = _event_id AND token = _token
  )
$$;

REVOKE ALL ON FUNCTION public.validate_invite_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS "public read prive-media" ON storage.objects;
