import { mkdirSync, writeFileSync } from 'fs';
import { nginxParts, nginxTestConfig } from './lib/nginx-snippet.mjs';

const out = process.argv[2] || 'ops/state/nginx';
const parts = nginxParts(process.env);
const config = nginxTestConfig(parts);
if (/listen\s+80\b/.test(config) || /listen\s+443\b/.test(config)) {
  process.stderr.write('nginx snippet 80/443 dinliyor\n');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/upstreams.conf`, parts.http, { mode: 0o644 });
writeFileSync(`${out}/locations.conf`, parts.locations, { mode: 0o644 });
writeFileSync(`${out}/test.conf`, config, { mode: 0o644 });
process.stdout.write('nginx snippet written\n');
