const { Client } = require("pg");
const client = new Client({
  connectionString: "postgresql://postgres:Comisuam%40e24%23%21@db.ngnrmxdbzbolxroibzax.supabase.co:5432/postgres"
});
const sql = `
CREATE TABLE IF NOT EXISTS public.shop_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.shop_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only for active coupons" ON public.shop_coupons;
CREATE POLICY "Allow public read-only for active coupons" ON public.shop_coupons FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Allow full access to admins" ON public.shop_coupons;
CREATE POLICY "Allow full access to admins" ON public.shop_coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
`;
async function run() {
  await client.connect();
  await client.query(sql);
  console.log("Migration executed successfully!");
  await client.end();
}
run().catch(console.error);

