
DROP POLICY IF EXISTS "anyone create order" ON public.orders;
CREATE POLICY "anyone create order" ON public.orders FOR INSERT WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "anyone create shop order" ON public.shop_orders;
CREATE POLICY "anyone create shop order" ON public.shop_orders FOR INSERT WITH CHECK (status = 'pending');
