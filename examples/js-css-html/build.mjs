// Canonical build: js + css + html.
// Run from the repo root:  node examples/js-css-html/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  jsPath: path.join(here, 'src', 'card.js'),
  cssPath: path.join(here, 'src', 'index.css'),
  templates: [
    { name: 'index', htmlPath: path.join(here, 'src', 'index.html'), token: '__STAT_CARD__' }
  ]
});

const [js, css, html] = await Promise.all([result.getJs(), result.getCss(), result.html.index.getHtml()]);
console.log('--- output js ---\n' + js);
console.log('\n--- output css ---\n' + css);
console.log('\n--- output html (index.html) ---\n' + html);
