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

async function migrate() {
  const data = JSON.parse(fs.readFileSync('./dump.json', 'utf8'));
  const images = data.product_images || [];
  
  let successCount = 0;
  let errorCount = 0;

  console.log(`Migrating ${images.length} images...`);

  // We can process concurrently for speed
  const concurrency = 10;
  
  for (let i = 0; i < images.length; i += concurrency) {
    const chunk = images.slice(i, i + concurrency);
    
    await Promise.all(chunk.map(async (img) => {
      if (!img.url || !img.url.includes('utuutzspepikllyszdrb.supabase.co')) return;
      
      const oldUrl = img.url;
      const urlObj = new URL(oldUrl);
      const pathParts = urlObj.pathname.split('/prive-media/')[1];
      
      if (!pathParts) return;
      
      try {
        const response = await fetch(oldUrl);
        if (!response.ok) {
          console.log(`Failed to fetch ${oldUrl}`);
          errorCount++;
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const { data, error } = await supabase.storage
          .from('prive-media')
          .upload(pathParts, buffer, {
            contentType: response.headers.get('content-type') || 'image/jpeg',
            upsert: true
          });
          
        if (error) {
          console.error(`Error uploading ${pathParts}:`, error);
          errorCount++;
        } else {
          console.log(`Uploaded ${pathParts}`);
          successCount++;
        }
      } catch (e) {
        console.error(`Error migrating ${oldUrl}:`, e);
        errorCount++;
      }
    }));
  }
  
  console.log(`Finished migrating images. Success: ${successCount}, Errors: ${errorCount}`);
}

migrate().catch(console.error);
