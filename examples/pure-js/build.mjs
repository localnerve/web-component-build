// Pure-JS build: only jsPath is passed — no templates, no css.
// Run from the repo root:  node examples/pure-js/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  jsPath: path.join(here, 'src', 'counter.js')
});

console.log('--- output js ---\n' + (await result.getJs()));
console.log('\ncssPath:', result.cssPath ?? '(none)');
console.log('html keys:', Object.keys(result.html));
