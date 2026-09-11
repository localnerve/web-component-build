// No html file: the template carries only css, injected as a bare <style> payload.
// Run from the repo root:  node examples/inline-style-no-html/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  jsPath: path.join(here, 'src', 'toast.js'),
  cssPath: path.join(here, 'src', 'toast.css'),
  templates: [
    // No htmlPath here — only the css payload is injected into the token.
    { name: 'inline', token: '__TOAST_CSS__' }
  ]
});

console.log('--- output js ---\n' + (await result.getJs()));
console.log('\nhtml keys:', Object.keys(result.html), '(no html file was written)');
