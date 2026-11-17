const fs = require('fs');

const envContent = fs.readFileSync('.env.example', 'utf8');
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s]+)/);
const serviceKey = keyMatch[1];
const baseUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';

async function main() {
  const res = await fetch(baseUrl + '/rest/v1/', {
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey
    }
  });
  
  const spec = await res.json();
  const tables = Object.keys(spec.definitions || {}).sort();
  console.log(`=== FOUND ${tables.length} TABLES/VIEWS IN REMOTE DATABASE ===`);
  tables.forEach((t, i) => {
    console.log(`${(i+1).toString().padStart(2, '0')}. ${t}`);
  });

  const paths = Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/')).sort();
  console.log(`\n=== FOUND ${paths.length} RPC FUNCTIONS IN REMOTE DATABASE ===`);
  paths.forEach((p, i) => {
    console.log(`${(i+1).toString().padStart(2, '0')}. ${p.replace('/rpc/', '')}`);
  });

  // Query each existing table for row count
  console.log('\n=== ROW COUNTS IN EXISTING TABLES ===');
  for (const table of tables) {
    try {
      const countRes = await fetch(`${baseUrl}/rest/v1/${table}?select=count`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': 'Bearer ' + serviceKey,
          'Range': '0-0',
          'Prefer': 'count=exact'
        }
      });
      const range = countRes.headers.get('content-range');
      const count = range ? range.split('/')[1] : 'unknown';
      console.log(`- ${table}: ${count} rows`);
    } catch (e) {
      console.log(`- ${table}: error fetching count (${e.message})`);
    }
  }
}

main().catch(err => {
  console.error('Fast inspect failed:', err);
  process.exit(1);
});
