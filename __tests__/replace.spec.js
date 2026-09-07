/**
 * Web Component Build - lib/replace.js unit tests
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as acorn from 'acorn';
import { injectTokens, escapeForContext } from '../lib/replace.js';

const TOKEN = '__JS_REPLACEMENT__';

/**
 * Parse injected source and return the value of the literal that contains the marker.
 * The marker is guaranteed absent from payloads in these tests.
 *
 * @param {String} code - The javascript source to decode.
 * @returns {Array} of string values found in literals containing `marker`.
 */
function extractLiterals (code, marker) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const values = [];

  (function walk (node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string' && node.value.includes(marker)) {
      values.push(node.value);
    } else if (node.type === 'TemplateLiteral') {
      const cooked = node.quasis.map(q => q.value.cooked).join('@@EXPRESSION@@');
      if (cooked.includes(marker)) {
        // marker lives entirely within one quasi in these tests
        const quasi = node.quasis.find(q => q.value.cooked.includes(marker));
        values.push(quasi ? quasi.value.cooked : cooked);
      }
    }
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => walk(child));
      } else if (value && typeof value.type === 'string') {
        walk(value);
      }
    }
  })(ast);

  return values;
}

/** Assert code parses with acorn. */
function assertParses (code) {
  try {
    acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (e) {
    throw new Error(
      `Expected valid javascript but parse failed: ${e.message}\n---\n${code}`,
      { cause: e }
    );
  }
}

describe('escapeForContext', () => {
  test('single quote context escapes quotes, backslashes, newlines', () => {
    const payload = 'it\'s a "test" \\ line\nnext';
    const escaped = escapeForContext(payload, '\'');
    assert.strictEqual(escaped, 'it\\\'s a "test" \\\\ line\\nnext');
  });

  test('double quote context escapes quotes, backslashes, newlines', () => {
    const payload = 'a " b \\ c\nd';
    const escaped = escapeForContext(payload, '"');
    assert.strictEqual(escaped, 'a \\" b \\\\ c\\nd');
  });

  test('template context escapes backticks and ${ but keeps newlines', () => {
    // build the raw payload via concatenation so no template interpolation happens here
    const payload = 'a ` b ${c} d\ne';
    const escaped = escapeForContext(payload, '`');
    assert.strictEqual(escaped, 'a \\` b \\${c} d\ne');
  });

  test('line separator U+2028 is escaped for single/double contexts only', () => {
    assert.strictEqual(escapeForContext('a\u2028b', '\''), 'a\\u2028b');
    assert.strictEqual(escapeForContext('a\u2028b', '`'), 'a\u2028b');
  });
});

describe('injectTokens', () => {
  test('single-quoted literal, payload with quotes and newlines round-trips', () => {
    const src = `const t = '${TOKEN}';`;
    const payload = '<li>It\'s "quoted" \\ back\nline2</li>';
    const out = injectTokens(src, [{ pattern: TOKEN, payload }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<li>'), [payload]);
  });

  test('double-quoted literal round-trips', () => {
    const src = `const t = "${TOKEN}";`;
    const payload = '<div class="x">It\'s here</div>';
    const out = injectTokens(src, [{ pattern: TOKEN, payload }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<div'), [payload]);
  });

  test('template literal round-trips', () => {
    const src = 'const t = `' + TOKEN + '`;';
    const payload = '<li>It\'s "quoted" `${\'x\'}\nline2</li>';
    const out = injectTokens(src, [{ pattern: TOKEN, payload }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<li>'), [payload]);
  });

  test('token as substring of a larger literal preserves neighbors', () => {
    const src = `const t = '${TOKEN}\\n<div>tail</div>';`;
    const payload = '<style>.x{color:red}</style>';
    const out = injectTokens(src, [{ pattern: TOKEN, payload }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<style>'), [
      '<style>.x{color:red}</style>\n<div>tail</div>'
    ]);
  });

  test('multiple tokens across literals', () => {
    const src = `const a = '${TOKEN}';\nlet b = "<span>__B__</span>";`;
    const out = injectTokens(src, [
      { pattern: TOKEN, payload: '<p>it\'s a</p>' },
      { pattern: '__B__', payload: '<em>"b" `c`</em>' }
    ]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<p>'), ['<p>it\'s a</p>']);
    assert.deepStrictEqual(extractLiterals(out, '<em>'), ['<span><em>"b" `c`</em></span>']);
  });

  test('multiple tokens in the same literal', () => {
    const src = `const t = '${TOKEN}-1 and ${'__TWO__'}-2';`;
    const out = injectTokens(src, [
      { pattern: TOKEN, payload: '<a>one</a>' },
      { pattern: '__TWO__', payload: '<b>two</b>' }
    ]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<a>'), ['<a>one</a>-1 and <b>two</b>-2']);
  });

  test('regexp pattern', () => {
    const src = `const t = '__TOKEN_${'ABC'}__';`;
    const out = injectTokens(src, [
      { pattern: /__TOKEN_\w+__/, payload: '<i>x</i>' }
    ]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<i>'), ['<i>x</i>']);
  });

  test('empty entries returns source unchanged', () => {
    const src = `const t = '${TOKEN}';`;
    assert.strictEqual(injectTokens(src, []), src);
  });

  test('throws when token not found', () => {
    assert.throws(
      () => injectTokens('const a = "nope";\n', [{ pattern: TOKEN, payload: 'x' }]),
      /not found in javascript source/
    );
  });

  test('throws when token is outside any literal', () => {
    assert.throws(
      () => injectTokens(`const ${TOKEN} = 1;`, [{ pattern: TOKEN, payload: 'x' }]),
      /not inside a string or template literal/
    );
  });

  test('throws when source does not parse', () => {
    assert.throws(
      () => injectTokens('const = ;', [{ pattern: TOKEN, payload: 'x' }]),
      /Failed to parse javascript/
    );
  });

  test('throws on overlapping tokens', () => {
    assert.throws(
      () => injectTokens(`const a = '${TOKEN}extra';`, [
        { pattern: TOKEN, payload: 'x' },
        { pattern: `${TOKEN}e`, payload: 'y' }
      ]),
      /overlap/
    );
  });

  test('throws when token is in an expression position of a template literal', () => {
    // token sits inside `${...}` - it is not part of any quasi, so reject
    const src = 'const t = `a${' + TOKEN + '}b`;';
    assert.throws(
      () => injectTokens(src, [{ pattern: TOKEN, payload: '<i>x</i>' }]),
      /crosses a template expression boundary/
    );

    // token text spans from inside an expression into the trailing quasi
    const src2 = 'const t = `a${10}b`;';
    assert.throws(
      () => injectTokens(src2, [{ pattern: '10}b', payload: '<i>x</i>' }]),
      /crosses a template expression boundary/
    );
  });

  test('script-mode source (no import/export) still parses and injects', () => {
    const src = `var t = '${TOKEN}';\ncustomElements.define('x', class extends HTMLElement {});`;
    const out = injectTokens(src, [{ pattern: TOKEN, payload: '<b>it\'s</b>' }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<b>'), ['<b>it\'s</b>']);
  });

  test('realistic component shape with multi-line html payload', () => {
    const src = [
      'class SomeComponent extends HTMLElement {',
      '  connectedCallback () {',
      `    this.shadowRoot.innerHTML = '${TOKEN}';`,
      '  }',
      '}'
    ].join('\n');
    const payload = '<style>.a{content:\'q\'}</style><div class="a">\n  <li>It\'s "fine" `ok` \\ end</li>\n</div>';
    const out = injectTokens(src, [{ pattern: TOKEN, payload }]);
    assertParses(out);
    assert.deepStrictEqual(extractLiterals(out, '<style>'), [payload]);
  });
});
