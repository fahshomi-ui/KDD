import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'server');
const out = path.join(root, 'dist');

await mkdir(out, { recursive: true });

for (const item of ['index.js', 'admin', 'public']) {
  const s = path.join(src, item);
  if (existsSync(s)) {
    await cp(s, path.join(out, item), { recursive: true });
    console.log('build-server: copied ' + item);
  }
}

await cp(path.join(src, 'package.json'), path.join(out, 'package.json'));

if (!existsSync(path.join(out, 'index.js'))) {
  console.error('build-server: FAILED - dist/index.js missing');
  process.exit(1);
}
console.log('build-server: dist/ جاهز');
