const { Client } = require('pg');

async function clear() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Comisuam%40e24%23%21@db.ngnrmxdbzbolxroibzax.supabase.co:5432/postgres'
  });
  await client.connect();
  console.log('Truncating tables...');
  await client.query('TRUNCATE profiles, categories, product_lines, products, product_variants, product_images, orders, order_items CASCADE');
  console.log('Truncated.');
  await client.end();
}

clear().catch(console.error);
