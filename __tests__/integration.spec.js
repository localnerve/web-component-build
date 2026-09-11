/**
 * Web Component Build - v4.0.0 integration tests (forward-looking)
 *
 * These tests exercise the syntax-aware injection end-to-end through build().
 * They are behavior-based: the emitted javascript is parsed with acorn and the
 * value of each injected literal is compared to the exact html that was written
 * to disk.
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wcb-400-'));
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

describe('v4.0.0 quote-robust injection', () => {
  test('single-quoted token: html/css with quotes, backticks, apostrophes round-trip', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      `class C extends HTMLElement {\n  connectedCallback () {\n    this.shadowRoot.innerHTML = '${TOKEN}';\n  }\n}\ncustomElements.define('c', C);\n`);
    const htmlPath = await writeFile(dir, 'index.html',
      '<div class="box">\n  <li>It\'s a "quoted" `tick` &amp; more</li>\n</div>');
    const cssPath = await writeFile(dir, 'index.css',
      '.box::before { content: "hello"; font-family: \'Fira Code\'; }\n.box{color:red}');

    const result = await build(dir, {
      jsPath, cssPath,
      templates: [{ name: 'index', htmlPath, token: TOKEN }]
    });

    const [js, html] = await Promise.all([result.getJs(), result.html.index.getHtml()]);
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

    const result = await build(dir, {
      jsPath,
      templates: [{ name: 'index', htmlPath, token: TOKEN }]
    });
    const [js, html] = await Promise.all([result.getJs(), result.html.index.getHtml()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<p>')[0], html);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('template-literal token round-trips', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n  connectedCallback () { this.shadowRoot.innerHTML = `' + TOKEN + '`; }\n}');
    const htmlPath = await writeFile(dir, 'index.html', '<p>It\'s "here" `ok`</p>');

    const result = await build(dir, {
      jsPath,
      templates: [{ name: 'index', htmlPath, token: TOKEN }]
    });
    const [js, html] = await Promise.all([result.getJs(), result.html.index.getHtml()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<p>')[0], html);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('css-only (no html) with quoted css content round-trips', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      `class C extends HTMLElement {\n  connectedCallback () { this.shadowRoot.innerHTML = '${TOKEN}'; }\n}`);
    const cssPath = await writeFile(dir, 'index.css', '.a::before{content:"x"}');

    const result = await build(dir, {
      jsPath, cssPath,
      templates: [{ name: 'inline', token: TOKEN }]
    });
    const [js, css] = await Promise.all([result.getJs(), result.getCss()]);
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.strictEqual(literalValues(js, '<style>')[0], `<style>${css}</style>`);

    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('v4.0.0 multi-template (templates option)', () => {
  test('three templates share one css (default sharedMultiTemplate "first"); each round-trips into its token', async () => {
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

    assert.deepStrictEqual(Object.keys(result.html), ['default', 'error', 'empty']);

    for (const name of ['default', 'error', 'empty']) {
      const entry = result.html[name];
      assert.strictEqual(entry.name, name);
      const onDisk = await fs.readFile(entry.path, 'utf8');
      assert.strictEqual(await entry.getHtml(), onDisk);
      // the exact html written to disk is what lives in the component's JS
      const needle = name === 'default' ? '<div' : (name === 'error' ? 'went wrong' : 'Nothing here');
      assert.strictEqual(literalValues(js, needle)[0], onDisk);
    }

    // default sharedMultiTemplate is "first": the shared css is embedded only in the
    // first template that uses it, so later templates stay style-free.
    const [diskDefault, diskError, diskEmpty] = await Promise.all([
      fs.readFile(result.html.default.path, 'utf8'),
      fs.readFile(result.html.error.path, 'utf8'),
      fs.readFile(result.html.empty.path, 'utf8')
    ]);
    assert.ok(diskDefault.includes('<style>'), 'first template embeds shared css');
    assert.ok(!diskError.includes('<style>'), 'second template does not re-embed shared css');
    assert.ok(!diskEmpty.includes('<style>'), 'third template does not re-embed shared css');

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('sharedMultiTemplate "every" embeds the shared css in each template', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n' +
      '  connectedCallback () {\n' +
      '    this.default = \'__TPL_DEFAULT__\';\n' +
      '    this.error = \'__TPL_ERROR__\';\n' +
      '  }\n}\ncustomElements.define(\'c\', C);\n');
    const cssPath = await writeFile(dir, 'index.css', '.base{color:blue}');
    const defaultHtml = await writeFile(dir, 'default.html', '<div class="base">default</div>');
    const errorHtml = await writeFile(dir, 'error.html', '<p>Something went wrong</p>');

    const result = await build(dir, {
      jsPath, cssPath,
      sharedMultiTemplate: 'every',
      templates: [
        { name: 'default', htmlPath: defaultHtml, token: '__TPL_DEFAULT__' },
        { name: 'error', htmlPath: errorHtml, token: '__TPL_ERROR__' }
      ]
    });

    const js = await result.getJs();
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });

    const [onDiskDefault, onDiskError] = await Promise.all([
      fs.readFile(result.html.default.path, 'utf8'),
      fs.readFile(result.html.error.path, 'utf8')
    ]);
    const EVERY = 'every';
    assert.ok(onDiskDefault.includes('<style>'), `${EVERY}: first template embeds shared css`);
    assert.ok(onDiskError.includes('<style>'), `${EVERY}: second template re-embeds shared css`);
    assert.strictEqual(literalValues(js, '<div')[0], onDiskDefault);
    assert.strictEqual(literalValues(js, 'went wrong')[0], onDiskError);

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

    const a = await fs.readFile(result.html.a.path, 'utf8');
    const b = await fs.readFile(result.html.b.path, 'utf8');
    assert.ok(a.includes('//shared.css'), 'template a uses shared href');
    assert.ok(!a.includes('//other.css'));
    assert.ok(b.includes('//other.css'), 'template b uses its own href');
    assert.ok(!b.includes('//shared.css'));

    const js = await result.getJs();
    acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module' });

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('per-template cssPath override while others use shared css', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js',
      'class C extends HTMLElement {\n' +
      '  connectedCallback () {\n' +
      '    this.a = \'__A__\';\n' +
      '    this.b = \'__B__\';\n' +
      '  }\n}');
    const sharedCss = await writeFile(dir, 'shared.css', '.s{color:blue}');
    const ownCss = await writeFile(dir, 'own.css', '.o{color:red}');
    const aHtml = await writeFile(dir, 'a.html', '<p>a</p>');
    const bHtml = await writeFile(dir, 'b.html', '<p>b</p>');

    const result = await build(dir, {
      jsPath,
      cssPath: sharedCss,
      templates: [
        { name: 'a', htmlPath: aHtml, token: '__A__' },
        { name: 'b', htmlPath: bHtml, token: '__B__', cssPath: ownCss }
      ]
    });

    const a = await fs.readFile(result.html.a.path, 'utf8');
    const b = await fs.readFile(result.html.b.path, 'utf8');
    // clean-css rewrites color names (blue -> #00f), so assert on the selectors
    assert.ok(a.includes('.s{'), 'template a embeds shared css selector');
    assert.ok(!a.includes('.o{'));
    assert.ok(b.includes('.o{'), 'template b embeds its own css selector');
    assert.ok(!b.includes('.s{'));

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

describe('v4.0.0 validation and error paths', () => {
  test('throws when nothing meaningful is supplied', async () => {
    await assert.rejects(build('/nonexistent/out', {}), /Did you forget something/);
  });

  test('throws upfront when outputDir does not exist', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}');
    const missing = path.join(dir, 'no-such-output-dir');
    await assert.rejects(
      build(missing, { jsPath }),
      /outputDir does not exist/
    );
    // the error is thrown before anything is written or read beyond validation
    const files = (await fs.readdir(dir)).filter(f => f !== 'component.js');
    assert.deepStrictEqual(files, []);
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('throws when outputDir is not a directory', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}');
    await assert.rejects(
      build(jsPath, { jsPath }),
      /outputDir is not a directory/
    );
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('throws when templates is not an array', async () => {
    await assert.rejects(
      build('/nonexistent/out', { jsPath: 'x.js', templates: 'nope' }),
      /must be an array/
    );
  });

  test('throws on an invalid sharedMultiTemplate value', async () => {
    await assert.rejects(
      build('/nonexistent/out', { jsPath: 'x.js', templates: [], sharedMultiTemplate: 'all' }),
      /"sharedMultiTemplate" must be "first" or "every"/
    );
  });

  test('throws on removed flat options with a migration message', async () => {
    await assert.rejects(
      build('/nonexistent/out', { htmlPath: 'index.html' }),
      /removed the flat/
    );
  });

  test('throws when a token is supplied without jsPath', async () => {
    const dir = await tempDir();
    const htmlPath = await writeFile(dir, 'index.html', '<p>x</p>');
    await assert.rejects(
      build(dir, { templates: [{ name: 'index', htmlPath, token: TOKEN }] }),
      /Did you forget 'jsPath'/
    );
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('throws when a token is not present in the javascript', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}');
    const htmlPath = await writeFile(dir, 'index.html', '<p>x</p>');
    await assert.rejects(
      build(dir, { jsPath, templates: [{ name: 'index', htmlPath, token: TOKEN }] }),
      /not found in javascript source/
    );
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('html-only component (no js/css) writes html and returns no js', async () => {
    const dir = await tempDir();
    const htmlPath = await writeFile(dir, 'index.html', '<p>just html</p>');
    const result = await build(dir, { templates: [{ name: 'index', htmlPath }] });
    assert.strictEqual(await result.getJs(), undefined);
    assert.ok((await result.html.index.getHtml()).includes('just html'));
    assert.deepStrictEqual(Object.keys(result.html), ['index']);
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('v3.5.0 deprecation warnings', () => {
  /**
   * Run build() in a child process so we capture stdout/stderr without polluting
   * the test runner's own console output. Returns { exitCode, stderr, stdout }.
   */
  async function runBuildInChild (code) {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath, ['--input-type=module', '-e', code],
        { encoding: 'utf8', timeout: 10_000 }
      );
      return { exitCode: 0, stdout, stderr };
    } catch (err) {
      return { exitCode: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
    }
  }

  const childModuleDir = path.join(import.meta.dirname, '..');

  test('flat options emit deprecation warnings to stderr', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}\ncustomElements.define(\'c\', C);');
    const htmlPath = await writeFile(dir, 'index.html', '<p>hi</p>');

    const code = `
      import { build } from '${childModuleDir}/index.js';
      await build(${JSON.stringify(dir)}, { jsPath: ${JSON.stringify(jsPath)}, htmlPath: ${JSON.stringify(htmlPath)}, jsReplacement: '__JS_REPLACEMENT__' });
    `;
    const { stderr } = await runBuildInChild(code);
    assert.ok(stderr.includes('deprecated'), 'should contain "deprecated"');
    assert.ok(stderr.includes('v4.0.0'), 'should reference v4.0.0');
    assert.ok(stderr.includes('templates'), 'should mention templates migration');

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('deprecationWarnings: false suppresses warnings', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}\ncustomElements.define(\'c\', C);');
    const htmlPath = await writeFile(dir, 'index.html', '<p>hi</p>');

    const code = `
      import { build } from '${childModuleDir}/index.js';
      await build(${JSON.stringify(dir)}, { jsPath: ${JSON.stringify(jsPath)}, htmlPath: ${JSON.stringify(htmlPath)}, jsReplacement: '__JS_REPLACEMENT__', deprecationWarnings: false });
    `;
    const { stderr } = await runBuildInChild(code);
    assert.ok(!stderr.includes('deprecated'), 'should NOT contain "deprecated"');

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS env suppresses warnings', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}\ncustomElements.define(\'c\', C);');
    const htmlPath = await writeFile(dir, 'index.html', '<p>hi</p>');

    const code = `
      import { build } from '${childModuleDir}/index.js';
      await build(${JSON.stringify(dir)}, { jsPath: ${JSON.stringify(jsPath)}, htmlPath: ${JSON.stringify(htmlPath)}, jsReplacement: '__JS_REPLACEMENT__' });
    `;
    // Run with the env var set — execFile directly for env control.
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    let stderr;
    try {
      const out = await execFileAsync(
        process.execPath, ['--input-type=module', '-e', code],
        { encoding: 'utf8', timeout: 10_000, env: { ...process.env, WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS: '1' } }
      );
      stderr = out.stderr;
    } catch (err) {
      stderr = err.stderr ?? '';
    }
    assert.ok(!stderr.includes('deprecated'), 'stderr should NOT contain "deprecated"');

    await fs.rm(dir, { recursive: true, force: true });
  });

  test('templates option does NOT emit deprecation warnings', async () => {
    const dir = await tempDir();
    const jsPath = await writeFile(dir, 'component.js', 'class C extends HTMLElement {}\ncustomElements.define(\'c\', C);');
    const htmlPath = await writeFile(dir, 'index.html', '<p>hi</p>');

    const code = `
      import { build } from '${childModuleDir}/index.js';
      await build(${JSON.stringify(dir)}, { jsPath: ${JSON.stringify(jsPath)}, templates: [{ name: 'index', htmlPath: ${JSON.stringify(htmlPath)}, token: '__JS_REPLACEMENT__' }] });
    `;
    const { stderr } = await runBuildInChild(code);
    assert.ok(!stderr.includes('deprecated'), 'should NOT contain "deprecated"');

    await fs.rm(dir, { recursive: true, force: true });
  });
});
