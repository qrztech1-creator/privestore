
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'bride', 'guest');
CREATE TYPE public.event_type AS ENUM ('casamento', 'cha_lingerie', 'despedida_solteira');
CREATE TYPE public.event_visibility AS ENUM ('public', 'private', 'secret');
CREATE TYPE public.event_status AS ENUM ('active', 'paused', 'closed');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  type event_type NOT NULL,
  bride_name TEXT NOT NULL,
  partner_name TEXT,
  event_date TIMESTAMPTZ,
  banner_url TEXT,
  message TEXT,
  playlist_url TEXT,
  visibility event_visibility NOT NULL DEFAULT 'private',
  status event_status NOT NULL DEFAULT 'active',
  palette JSONB NOT NULL DEFAULT '{"primary":"#c9a27a","accent":"#e8c4b8","bg":"#1a1416","text":"#f7eee5"}',
  whatsapp_number TEXT,
  secret_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_owner ON public.events(owner_id);

-- Products (catalog)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Event products (bride wishlist)
CREATE TABLE public.event_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  desired_qty INT NOT NULL DEFAULT 1,
  purchased_qty INT NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  UNIQUE (event_id, product_id)
);
ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  message TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  event_product_id UUID REFERENCES public.event_products ON DELETE SET NULL,
  product_id UUID REFERENCES public.products ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Event invites (guest tokens)
CREATE TABLE public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  guest_label TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile + assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'bride')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- Profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Events: public events readable by anyone, owners and admins always see; private/secret too if owner/admin
CREATE POLICY "public events readable" ON public.events FOR SELECT USING (
  visibility = 'public' OR auth.uid() = owner_id OR public.is_admin(auth.uid())
);
CREATE POLICY "admin and owner manage events" ON public.events FOR ALL USING (
  public.is_admin(auth.uid()) OR auth.uid() = owner_id
) WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = owner_id);

-- Products: anyone reads, admin manages
CREATE POLICY "products readable by all" ON public.products FOR SELECT USING (true);
CREATE POLICY "admin manage products" ON public.products FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Event products: same access as parent event
CREATE POLICY "event products readable" ON public.event_products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.visibility = 'public' OR e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);
CREATE POLICY "owner admin manage event products" ON public.event_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);

-- Orders: guests can insert, owner/admin read
CREATE POLICY "anyone create order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "owner admin read orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);
CREATE POLICY "owner admin update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);

CREATE POLICY "anyone create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "owner admin read order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.events e ON e.id = o.event_id WHERE o.id = order_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);

-- Event invites: owner/admin manage; anyone can read by token (handled via server-side lookup)
CREATE POLICY "owner admin manage invites" ON public.event_invites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.owner_id = auth.uid() OR public.is_admin(auth.uid())))
);
CREATE POLICY "invites readable by token" ON public.event_invites FOR SELECT USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('prive-media', 'prive-media', true) ON CONFLICT DO NOTHING;
CREATE POLICY "public read prive-media" ON storage.objects FOR SELECT USING (bucket_id = 'prive-media');
CREATE POLICY "auth users upload prive-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prive-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth users update own prive-media" ON storage.objects FOR UPDATE USING (bucket_id = 'prive-media' AND auth.uid() = owner);
CREATE POLICY "auth users delete own prive-media" ON storage.objects FOR DELETE USING (bucket_id = 'prive-media' AND (auth.uid() = owner OR public.is_admin(auth.uid())));

-- Trigger to update purchased_qty on order_items insert
CREATE OR REPLACE FUNCTION public.bump_purchased_qty()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.event_product_id IS NOT NULL THEN
    UPDATE public.event_products SET purchased_qty = purchased_qty + NEW.qty WHERE id = NEW.event_product_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_purchased AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.bump_purchased_qty();
