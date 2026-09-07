/**
 * Web Component Build - v3.5.0 integration tests (forward-looking)
 * 
 * These tests exercise the syntax-aware injection end-to-end through build().
 * They are behavior-based: the emitted javascript is parsed with acorn and the
 * value of each injected literal is compared to the exact html that was written
 * to disk. Nothing here mirrors the removed line-continuation hack.
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import * as acorn from 'acorn';
import { build } from '../index.js';

const TOKEN = '__JS_REPLACEMENT__';

async function tempDir () {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wcb-350-'));
  return dir;
}

/** Write a file under dir, returning its full path. */
async function writeFile (dir, name, content) {
  const p = path.join(dir, name);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf8');
  return p;
}

/** Return the values of all string/template literals in code containing `needle`. */
function literalValues (code, needle) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const out = [];
  (function walk (node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string' && node.value.includes(needle)) {
      out.push(node.value);
    } else if (node.type === 'TemplateLiteral') {
      const quasi = node.quasis.find(q => q.value.cooked && q.value.cooked.includes(needle));
      if (quasi) out.push(quasi.value.cooked);
    }
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value.type === 'string') walk(value);
    }
  })(ast);
  return out;
}

describe('v3.5.0 quote-robust injection', () => {
  test('single-quoted token: html/css with quotes, backticks, apostrophes round-trip', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      `class C extends HTMLElement {\n  connectedCallback () {\n    this.shadowRoot.innerHTML = '${TOKEN}';\n  }\n}\ncustomElements.define('c', C);\n`);
    const htmlPath = await writeFile(dir, 'index.html',
      '<div class="box">\n  <li>It\'s a "quoted" `tick` &amp; more</li>\n</div>');
    const cssPath = await writeFile(dir, 'index.css',
      '.box::before { content: "hello"; font-family: \'Fira Code\'; }\n.box{color:red}');

    const result = await build(dir, {
      jsPath, htmlPath, cssPath, jsReplacement: TOKEN
    });

    const [js, html] = await Promise.all([result.getJs(), result.getHtml()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' }); // must parse
    assert.strictEqual(html.length > 0, true);
    // the injected literal value is EXACTLY the html written to disk
    const values = literalValues(js, '<div');
    assert.strictEqual(values.length, 1);
    assert.strictEqual(values[0], html);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('double-quoted token round-trips', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      `class C extends HTMLElement {\n  connectedCallback () { this.shadowRoot.innerHTML = "${TOKEN}"; }\n}`);
    const htmlPath = await writeFile(dir, 'index.html', '<p>It\'s "here" `ok`</p>');

    const result = await build(dir, { jsPath, htmlPath, jsReplacement: TOKEN });
    const [js, html] = await Promise.all([result.getJs(), result.getHtml()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<p>')[0], html);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('template-literal token round-trips', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n  connectedCallback () { this.shadowRoot.innerHTML = `' + TOKEN + '`; }\n}');
    const htmlPath = await writeFile(dir, 'index.html', '<p>It\'s "here" `ok`</p>');

    const result = await build(dir, { jsPath, htmlPath, jsReplacement: TOKEN });
    const [js, html] = await Promise.all([result.getJs(), result.getHtml()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<p>')[0], html);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('css-only (no html) with quoted css content round-trips', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      `class C extends HTMLElement {\n  connectedCallback () { this.shadowRoot.innerHTML = '${TOKEN}'; }\n}`);
    const cssPath = await writeFile(dir, 'index.css', '.a::before{content:"x"}');

    const result = await build(dir, { jsPath, cssPath, jsReplacement: TOKEN });
    const [js, css] = await Promise.all([result.getJs(), result.getCss()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<style>')[0], `<style>${css}</style>`);

    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('v3.5.0 multi-template (templates option)', () => {
  test('three templates share one css; each round-trips into its token', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n' +
      '  connectedCallback () {\n' +
      '    this.default = \'__TPL_DEFAULT__\';\n' +
      '    this.error = \'__TPL_ERROR__\';\n' +
      '    this.empty = \'__TPL_EMPTY__\';\n' +
      '  }\n}\ncustomElements.define(\'c\', C);\n');
    const cssPath = await writeFile(dir, 'index.css', '.base{color:blue} .err{content:\'!\'}');
    const defaultHtml = await writeFile(dir, 'default.html', '<div class="base">It\'s the "default" `state`</div>');
    const errorHtml = await writeFile(dir, 'error.html', '<p class="err">Something went wrong</p>');
    const emptyHtml = await writeFile(dir, 'empty.html', '<p>Nothing here</p>');

    const result = await build(dir, {
      jsPath, cssPath,
      templates: [
        { name: 'default', htmlPath: defaultHtml, token: '__TPL_DEFAULT__' },
        { name: 'error', htmlPath: errorHtml, token: '__TPL_ERROR__' },
        { name: 'empty', htmlPath: emptyHtml, token: '__TPL_EMPTY__' }
      ]
    });

    const js = await result.getJs();
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });

    assert.strictEqual(result.htmls.length, 3);
    assert.deepStrictEqual(
      result.htmls.map(h => h.name), ['default', 'error', 'empty']
    );

    for (const entry of result.htmls) {
      const onDisk = await fs.readFile(entry.path, 'utf8');
      assert.strictEqual(await entry.getHtml(), onDisk);
      // the exact html written to disk is what lives in the component's JS
      const needle = entry.name === 'default' ? '<div' : (entry.name === 'error' ? 'went wrong' : 'Nothing here');
      assert.strictEqual(literalValues(js, needle)[0], onDisk);
    }

    // backward-compat shorthands resolve to the first template
    assert.strictEqual(result.htmlPath, result.htmls[0].path);
    assert.strictEqual(await result.getHtml(), await fs.readFile(result.htmls[0].path, 'utf8'));

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('per-template cssLinkHref override while others use shared', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n' +
      '  connectedCallback () {\n' +
      '    this.a = \'__A__\';\n' +
      '    this.b = \'__B__\';\n' +
      '  }\n}');
    const aHtml = await writeFile(dir, 'a.html', '<p>a</p>');
    const bHtml = await writeFile(dir, 'b.html', '<p>b</p>');

    const result = await build(dir, {
      jsPath,
      cssLinkHref: '//shared.css',
      templates: [
        { name: 'a', htmlPath: aHtml, token: '__A__' },
        { name: 'b', htmlPath: bHtml, token: '__B__', cssLinkHref: '//other.css' }
      ]
    });

    const a = await fs.readFile(result.htmls[0].path, 'utf8');
    const b = await fs.readFile(result.htmls[1].path, 'utf8');
    assert.ok(a.includes('//shared.css'), 'template a uses shared href');
    assert.ok(!a.includes('//other.css'));
    assert.ok(b.includes('//other.css'), 'template b uses its own href');
    assert.ok(!b.includes('//shared.css'));

    const js = await result.getJs();
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('throws on duplicate html output names', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C{}\n');
    const aHtml = await writeFile(dir, 'a/index.html', '<p>a</p>');
    const bHtml = await writeFile(dir, 'b/index.html', '<p>b</p>');

    await assert.rejects(
      build(dir, {
        jsPath,
        templates: [
          { htmlPath: aHtml, token: '__A__' },
          { htmlPath: bHtml, token: '__B__' }
        ]
      }),
      /Duplicate html output name/
    );

    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('v3.5.0 validation and error paths', () => {
  test('throws when nothing meaningful is supplied', async () => {
    await assert.rejects(build('/nonexistent/out', {}), /Did you forget something/);
  });

  test('throws when a token is supplied without jsPath', async () => {
    const dir = await tempDir();
    const htmlPath = await writeFile(dir, 'index.html', '<p>x</p>');
    await assert.rejects(
      build(dir, { htmlPath, jsReplacement: TOKEN }),
      /Did you forget 'jsPath'/
    );
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('throws when a token is not present in the javascript', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}');
    const htmlPath = await writeFile(dir, 'index.html', '<p>x</p>');
    await assert.rejects(
      build(dir, { jsPath, htmlPath, jsReplacement: TOKEN }),
      /not found in javascript source/
    );
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('html-only component (no js/css) writes html and returns no js', async () => {
    const dir = await tempDir();
    const htmlPath = await writeFile(dir, 'index.html', '<p>just html</p>');
    const result = await build(dir, { htmlPath });
    assert.strictEqual(await result.getJs(), undefined);
    assert.ok((await result.getHtml()).includes('just html'));
    assert.ok(result.htmls.length === 1);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
