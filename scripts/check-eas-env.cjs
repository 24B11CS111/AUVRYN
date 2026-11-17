const { execFileSync } = require('child_process');

try {
  const output = execFileSync('npx.cmd', ['eas', 'env:list', '--environment', 'preview'], {
    cwd: 'apps/mobile',
    shell: true,
    encoding: 'utf8'
  });

  const lines = output.split('\n');
  lines.forEach(line => {
    if (line.includes('EXPO_PUBLIC_SUPABASE_URL')) {
      console.log('SUPABASE URL:', line.trim());
    } else if (line.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
      const match = line.match(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (match) {
        try {
          const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64').toString());
          console.log(`KEY ROLE CHECK: role = "${payload.role}" (Confirmed: ${payload.role === 'anon' ? 'IS PUBLIC ANON KEY' : 'WARNING: NOT ANON KEY'})`);
        } catch (e) {
          console.log('Failed to parse JWT payload');
        }
      } else {
        console.log('No JWT pattern found in anon key line');
      }
    }
  });
} catch (err) {
  console.error('Error checking EAS env:', err.message);
}
