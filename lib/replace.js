/**
 * Web Component Build
 * Syntax-aware injection of payloads into string/template literals in a JS source file.
 * 
 * Replaces brittle text replacement (String.replace of a token) with an AST-based
 * splice: the token is located inside its containing string or template literal via
 * acorn, and the payload is escaped for that literal's quote context before being
 * spliced in at the exact character offsets. This keeps the surrounding JavaScript
 * valid regardless of quotes, backticks, "${" sequences, backslashes, or newlines
 * present in the payload.
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as acorn from 'acorn';

/**
 * Parse javascript source, tolerating both module and script syntax.
 *
 * @param {String} code - The javascript source text.
 * @returns {Object} The acorn AST.
 */
function parseJs (code) {
  const attempts = [{ sourceType: 'module' }, { sourceType: 'script' }];
  let lastError;
  for (const opt of attempts) {
    try {
      return acorn.parse(code, { ecmaVersion: 'latest', ...opt });
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(
    `Failed to parse javascript for token injection: ${lastError.message}`,
    { cause: lastError }
  );
}

/**
 * Collect all string Literal and TemplateLiteral nodes from an AST.
 *
 * @param {Object} ast - The acorn AST.
 * @returns {Array} of literal nodes (absolute start/end offsets).
 */
function collectLiterals (ast) {
  const literals = [];

  (function walk (node) {
    if (!node || typeof node.type !== 'string') return;
    if ((node.type === 'Literal' && typeof node.value === 'string') ||
        node.type === 'TemplateLiteral') {
      literals.push(node);
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

  return literals;
}

/**
 * Resolve the character span of a pattern within text.
 *
 * @param {String} text - The full source text.
 * @param {String|RegExp} pattern - The token to locate (string or regular expression).
 * @returns {Object|null} {start, end} offsets into text, or null when not found.
 */
function findSpan (text, pattern) {
  if (typeof pattern === 'string') {
    const i = text.indexOf(pattern);
    return i < 0 ? null : { start: i, end: i + pattern.length };
  }
  const re = pattern.global
    ? new RegExp(pattern.source, pattern.flags.replace(/g/g, ''))
    : pattern;
  const m = re.exec(text);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

/**
 * Human-readable label for a pattern, used in error messages.
 *
 * @param {String|RegExp} pattern - The token pattern.
 * @returns {String} A short description of the pattern.
 */
function describePattern (pattern) {
  if (typeof pattern === 'string') {
    const short = pattern.length > 60 ? `${pattern.slice(0, 60)}…` : pattern;
    return `'${short}'`;
  }
  return String(pattern);
}

/**
 * Escape a payload so it is valid inside the given string literal context.
 * 
 * For single/double quoted literals the result is a one-line interior (newlines,
 * line separators, and the delimiter are escaped). For template literals only the
 * backtick, "${", and backslash need escaping; raw newlines are legal.
 *
 * @param {String} payload - The content to inject.
 * @param {String} context - The opening quote of the containing literal: ', ", or `.
 * @returns {String} The escaped interior text.
 */
export function escapeForContext (payload, context) {
  let out = String(payload).replace(/\\/g, '\\\\');

  if (context === '`') {
    return out
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
  }

  const delimEscape = context === '\'' ? '\\\'' : '\\"';

  return out
    .replace(context === '\'' ? /'/g : /"/g, delimEscape)
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Inject payloads into the string/template literals containing the given tokens.
 * 
 * The source is parsed once; every token's literal node and absolute span are
 * located on the original source, then splices are applied back-to-front so that
 * earlier offsets remain valid. Multiple tokens may share a single literal or be
 * spread across the file.
 *
 * @param {String} jsText - The full javascript source text.
 * @param {Array} entries - Array of {pattern: String|RegExp, payload: String}.
 * @returns {String} The new javascript source text with all tokens replaced.
 * @throws {Error} When the source does not parse, a token is missing or lies
 * outside any string/template literal, a template token crosses a "${}"
 * expression boundary, or token spans overlap.
 */
export function injectTokens (jsText, entries) {
  if (!Array.isArray(entries) || entries.length === 0) return jsText;

  const literals = collectLiterals(parseJs(jsText));

  // locate every token on the original source before splicing anything
  const splices = entries.map(entry => {
    const label = describePattern(entry.pattern);
    const span = findSpan(jsText, entry.pattern);
    if (!span) {
      throw new Error(`Replacement token ${label} not found in javascript source.`);
    }

    const node = literals
      .filter(n => n.start <= span.start && span.end <= n.end)
      .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];

    if (!node) {
      throw new Error(`Replacement token ${label} is not inside a string or template literal.`);
    }

    if (node.type === 'TemplateLiteral') {
      const quasi = node.quasis.find(q => q.start <= span.start && span.end <= q.end);
      if (!quasi) {
        throw new Error(
          `Replacement token ${label} crosses a template expression boundary (${'{…}'}); not supported.`
        );
      }
    }

    return { ...span, context: jsText[node.start], payload: entry.payload, label };
  });

  // reject overlapping spans (including duplicates)
  const ascending = [...splices].sort((a, b) => a.start - b.start);
  for (let i = 1; i < ascending.length; i++) {
    if (ascending[i].start < ascending[i - 1].end) {
      throw new Error(
        `Replacement tokens ${ascending[i - 1].label} and ${ascending[i].label} overlap in the javascript source.`
      );
    }
  }

  // apply splices back-to-front so earlier offsets stay valid
  let out = jsText;
  const descending = [...splices].sort((a, b) => b.start - a.start);
  for (const s of descending) {
    out = out.slice(0, s.start) + escapeForContext(s.payload, s.context) + out.slice(s.end);
  }

  return out;
}
