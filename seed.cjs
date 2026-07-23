const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const ws = require('ws');

const supabase = createClient(
  'https://ngnrmxdbzbolxroibzax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbnJteGRiemJvbHhyb2liemF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1OTUwNCwiZXhwIjoyMTAwMzM1NTA0fQ.YvN_5qym5pc03jNcLbsekTO9kGSKJSi9RvaSIKV9Oo8',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      transport: ws
    }
  }
);

async function seed() {
  const data = JSON.parse(fs.readFileSync('./dump.json', 'utf8'));

  // Define insertion order (parents first)
  const tables = [
    'profiles',
    'categories',
    'product_lines',
    'products',
    'product_variants',
    'product_images',
    'orders',
    'order_items'
  ];

  for (const table of tables) {
    const rows = data[table];
    if (rows && rows.length > 0) {
      console.log(`Seeding ${rows.length} rows into ${table}...`);
      
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        
        // Let's replace the old domain with the new domain in product_images urls
        if (table === 'product_images') {
          for (const row of chunk) {
            if (row.url && row.url.includes('utuutzspepikllyszdrb.supabase.co')) {
              row.url = row.url.replace('utuutzspepikllyszdrb.supabase.co', 'ngnrmxdbzbolxroibzax.supabase.co');
            }
          }
        }
        
        const { error } = await supabase.from(table).upsert(chunk);
        if (error) {
          console.error(`Error inserting into ${table}:`, error);
        }
      }
      console.log(`Finished ${table}.`);
    } else {
      console.log(`No data to seed for ${table}.`);
    }
  }
}

seed().catch(console.error);
