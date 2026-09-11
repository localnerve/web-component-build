// Multi-template build: three authored states, one token each.
// Runs BOTH sharedMultiTemplate modes into separate output dirs so you can
// diff how the shared css is distributed.
// Run from the repo root:  node examples/multi-template/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await Promise.all(['first', 'every'].map(m => fs.mkdir(path.join(here, 'output', m), { recursive: true })));
const src = name => path.join(here, 'src', name);

function options (mode) {
  return {
    jsPath: src('grid.js'),
    cssPath: src('grid.css'),
    sharedMultiTemplate: mode,
    templates: [
      { name: 'default', htmlPath: src('default.html'), token: '__GRID_DEFAULT__' },
      { name: 'empty', htmlPath: src('empty.html'), token: '__GRID_EMPTY__' },
      { name: 'error', htmlPath: src('error.html'), token: '__GRID_ERROR__' }
    ]
  };
}

async function run (mode) {
  const outDir = path.join(here, 'output', mode);
  const result = await build(outDir, options(mode));
  const [js, css] = await Promise.all([result.getJs(), result.getCss()]);
  console.log(`\n=== sharedMultiTemplate: "${mode}" -> ${outDir} ===`);
  console.log('css (canonical output):', css);
  for (const name of Object.keys(result.html)) {
    const html = await result.html[name].getHtml();
    console.log(`\n--- ${name}.html (${html.length} bytes) ---\n${html}`);
  }
  return js;
}

const jsFirst = await run('first');
await run('every');
console.log('\n=== output js (identical in both modes — only the html differs) ===');
console.log(jsFirst.slice(0, 400) + ' …');
