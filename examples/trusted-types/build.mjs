// Trusted Types component build.
// Note: minifySkip is set true on purpose — terser does NOT bundle, so the
// output must keep its relative `import` of the browser helpers resolvable.
// From a bundler you would alias or inline that import and drop minifySkip.
// Run from the repo root:  node examples/trusted-types/build.mjs
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from '../../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(here, 'output'), { recursive: true });
const result = await build(path.join(here, 'output'), {
  jsPath: path.join(here, 'src', 'comment-list.js'),
  cssPath: path.join(here, 'src', 'index.css'),
  templates: [
    { name: 'index', htmlPath: path.join(here, 'src', 'index.html'), token: '__COMMENT_LIST__' }
  ],
  minifySkip: true
});

console.log('--- output js ---\n' + (await result.getJs()));
console.log('\n--- output html (index.html) ---\n' + (await result.html.index.getHtml()));
