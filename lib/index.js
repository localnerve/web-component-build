/**
 * Web Component Build
 * Assemble and minify a web component from its parts.
 * Expose parts back to the calling build process.
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as cheerio from 'cheerio';
import { createBuild, defaultHtmlMinifyOptions } from './build.js';
import { injectTokens } from './replace.js';

/**
 * Derive an html output base name (without extension) from an input path.
 * A trailing ".html" is stripped so the registered output path ends in a single
 * ".html". Other names are used as-is.
 *
 * @param {String} htmlPath - The full path to the input html file.
 * @returns {String} The base name without extension.
 */
function htmlBaseName (htmlPath) {
  const base = path.basename(htmlPath);
  return base.endsWith('.html') ? base.slice(0, -'.html'.length) : base;
}

/**
 * Build entry point.
 *
 * @param {String} outputDir - full path to the output directory. MUST exist before
 *   calling build(); the library never creates (or cleans) directories itself.
 * @param {Object} options - build options
 * @param {Array} options.templates - REQUIRED. List of templates, each an object with:
 *   name (output filename), htmlPath, token (String|RegExp), and optional cssPath /
 *   cssLinkHref overrides that fall back to the shared top-level values.
 * @param {String} [options.jsPath] - full path to the javascript file
 * @param {String} [options.cssPath] - shared css; embedded into templates per the `sharedMultiTemplate` mode (default "first")
 * @param {String} [options.cssLinkHref] - shared link href; embedded into templates per the `sharedMultiTemplate` mode (default "first")
 * @param {String} [options.sharedMultiTemplate] - how SHARED css/link are embedded across templates:
 *   "first" (default) embeds them only in the first template that uses them, so several
 *   templates of one component placed in a single shadow root do not duplicate the
 *   styles; "every" embeds them in each template (each output stays self-contained).
 *   Per-template cssPath/cssLinkHref overrides are ALWAYS embedded in their own template.
 * @param {Object} [options.terserOptions] - Js minifier options (terser)
 * @param {Object} [options.htmlminOptions] - html-minifier options
 * @param {Object} [options.cleancssOptions] - clean-css options
 * @param {Boolean} [options.minifySkip] - default false, flag to skip all minification (debug)
 * @returns {Object} Interface exposing cssPath/getCss, jsPath/getJs, and an html map keyed by template name
 */
export async function build (outputDir, {
  jsPath,
  cssPath,
  cssLinkHref,
  templates = [],
  htmlPath,      // v4: removed — detected only to emit a migration error
  jsReplacement, // v4: removed — detected only to emit a migration error
  sharedMultiTemplate = 'first',
  terserOptions,
  htmlminOptions,
  cleancssOptions,
  minifySkip = false
} = {}) {
  // v4: the flat single-template options are gone. Detect them so callers get a
  // clear migration message instead of a silent no-op.
  if (htmlPath !== undefined || jsReplacement !== undefined) {
    throw new Error(
      'v4 removed the flat "htmlPath"/"jsReplacement" options. Migrate to the ' +
      '"templates" array, e.g. templates: [{ name, htmlPath, token }].'
    );
  }
  if (!Array.isArray(templates)) {
    throw new Error('"templates" must be an array.');
  }
  if (sharedMultiTemplate !== 'first' && sharedMultiTemplate !== 'every') {
    throw new Error('"sharedMultiTemplate" must be "first" or "every".');
  }

  const resolved = templates.map((t, i) => ({
    name: t.name || (t.htmlPath ? htmlBaseName(t.htmlPath) : `template-${i}`),
    htmlPath: t.htmlPath,
    token: t.token,
    cssPath: t.cssPath !== undefined ? t.cssPath : cssPath,
    cssLinkHref: t.cssLinkHref !== undefined ? t.cssLinkHref : cssLinkHref
  }));

  // A token with no jsPath to inject into is always an error.
  if (!jsPath && resolved.some(t => t.token)) {
    throw new Error('Invalid input, a replacement token was supplied without jsPath. Did you forget \'jsPath\'?');
  }
  if (!jsPath && !cssPath && resolved.every(t => !t.htmlPath)) {
    throw new Error(
      'One of jsPath, cssPath, or a template htmlPath MUST be supplied to do something\n meaningful. Did you forget something?'
    );
  }

  // outputDir is the caller's responsibility: check it exists (and is a directory)
  // upfront so a typo'd path fails fast with a clear message instead of ENOENT
  // deep inside the first write.
  let stat;
  try {
    stat = await fs.stat(outputDir);
  } catch {
    throw new Error(`outputDir does not exist: "${outputDir}". Create it before calling build().`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`outputDir is not a directory: "${outputDir}".`);
  }

  // The shared (top-level) cssPath is the canonical output css file. Per-template
  // css overrides are minified on demand and used only for embedding.
  const build = createBuild(outputDir, jsPath, cssPath, minifySkip);
  let jsText;

  if (jsPath) {
    jsText = await fs.readFile(jsPath, { encoding: 'utf8' });
  }

  const cssCache = new Map(); // css path -> minified text
  if (cssPath) {
    cssCache.set(cssPath, await build.minifyCss(cleancssOptions));
  }

  // Resolve the css text to embed for a template's effective css path.
  const cssFor = async p => {
    if (!p) return undefined;
    if (!cssCache.has(p)) {
      cssCache.set(p, await build.minifyCssFile(p, cleancssOptions));
    }
    return cssCache.get(p);
  };

  // Detect duplicate html output names before writing anything.
  const seenNames = new Set();
  for (const template of resolved.filter(t => t.htmlPath)) {
    if (seenNames.has(template.name)) {
      throw new Error(
        `Duplicate html output name "${template.name}". Give each template a distinct "name".`
      );
    }
    seenNames.add(template.name);
  }

  // Process each template: minify its html (with its style/link prepended per the
  // sharedMultiTemplate mode) and write it, or compute an inline css/link payload when
  // there is no html file. Shared css/link are embedded only in the first template
  // that uses them unless sharedMultiTemplate is "every"; per-template cssPath/cssLinkHref
  // overrides are ALWAYS embedded in their own template (and keep every output
  // self-contained).
  const injection = [];
  let sharedCssEmbedded;
  let sharedLinkEmbedded;
  for (const template of resolved) {
    const hasOwnCss = template.cssPath !== undefined && template.cssPath !== cssPath;
    const hasOwnLink =
      template.cssLinkHref !== undefined && template.cssLinkHref !== cssLinkHref;
    const embedCss = hasOwnCss || sharedMultiTemplate === 'every' || !sharedCssEmbedded;
    const embedLink = hasOwnLink || sharedMultiTemplate === 'every' || !sharedLinkEmbedded;

    const templateCss = embedCss ? await cssFor(template.cssPath) : undefined;
    let payload;
    if (template.htmlPath) {
      const outputPath = build.addHtmlOutput(template.name);
      const sourceHtml = await fs.readFile(template.htmlPath, { encoding: 'utf8' });
      const $ = cheerio.load(sourceHtml);
      const opts = { ...(htmlminOptions || defaultHtmlMinifyOptions) };
      if (templateCss) {
        $('body').prepend(`<style>${templateCss}</style>`);
        opts.minifyCSS = cleancssOptions;
        if (!hasOwnCss) sharedCssEmbedded = true;
      }
      if (embedLink && template.cssLinkHref) {
        $('body').prepend(`<link href="${template.cssLinkHref}" rel="stylesheet" />`);
        if (!hasOwnLink) sharedLinkEmbedded = true;
      }
      payload = await build.writeHtml($('body').html(), outputPath, opts);
    } else if (templateCss) {
      payload = `<style>${templateCss}</style>`;
      if (!hasOwnCss) sharedCssEmbedded = true;
    } else if (embedLink && template.cssLinkHref) {
      payload = `<link href="${template.cssLinkHref}" rel="stylesheet" />`;
      if (!hasOwnLink) sharedLinkEmbedded = true;
    }

    if (payload !== undefined && template.token) {
      injection.push({ pattern: template.token, payload });
    }
  }

  if (injection.length > 0) {
    jsText = injectTokens(jsText, injection);
  }

  if (jsText) {
    await build.minifyJs(jsText, terserOptions);
  }

  return build.output;
}