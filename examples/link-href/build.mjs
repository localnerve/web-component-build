// External stylesheet pattern: cssLinkHref instead of inlined css.
// Run from the repo root:  node examples/link-href/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  jsPath: path.join(here, 'src', 'banner.js'),
  // No cssPath — the styles are NOT inlined. In production this would be a
  // CDN url like '//cdn.example.com/banners.css'.
  cssLinkHref: './src/banner.css',
  templates: [
    { name: 'index', htmlPath: path.join(here, 'src', 'index.html'), token: '__PROMO_BANNER__' }
  ]
});

console.log('--- output js ---\n' + (await result.getJs()));
console.log('\ncssPath:', result.cssPath ?? '(none — no css was inlined or written)');
console.log('\n--- output html (index.html) ---\n' + (await result.html.index.getHtml()));
