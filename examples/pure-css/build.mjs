// Pure-CSS build: only cssPath is passed — no js, no templates.
// Run from the repo root:  node examples/pure-css/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  cssPath: path.join(here, 'src', 'theme.css')
});

console.log('--- output css ---\n' + (await result.getCss()));
console.log('\ncssPath:', result.cssPath);
console.log('jsPath:', result.jsPath ?? '(none)');
