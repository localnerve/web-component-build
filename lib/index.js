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
import { log, deprecationsEnabled } from './log.js';

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
 * @param {String} outputDir - full path to the output directory
 * @param {Object} [options] - optional options
 * @param {String} [options.jsPath] - full path to the javascript file
 * @param {String} [options.cssPath] - full path to the input css file
 * @param {String} [options.cssLinkHref] - http href to css resource
 * @param {String} [options.htmlPath] - full path to the input html file (single template)
 * @param {String} [options.jsReplacement] - Replacement token in the js file (single template)
 * @param {Array} [options.templates] - list of templates, each {name, htmlPath, token,
 *   cssLinkHref}. When supplied, takes precedence over the flat options. Shared
 *   cssPath/cssLinkHref are applied to every template unless a template overrides
 *   its own cssLinkHref.
 * @param {Object} [options.terserOptions] - Js minifier options (terser)
 * @param {Object} [options.htmlminOptions] - html-minifier options
 * @param {Object} [options.cleancssOptions] - clean-css options
 * @param {Boolean} [options.minifySkip] - default false, flag to skip all minification (debug)
 * @param {Boolean} [options.deprecationWarnings=true] - default true, emit console.warn
 *   messages for flat single-template options and the htmlPath/getHtml shorthands
 *   that are removed in v4.0.0. Set false (or env WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS) to suppress.
 * @returns {Object} Interface to getCss, getHtml, getJs, and htmls for further processing
 */
export async function build (outputDir, {
  jsPath,
  cssPath,
  cssLinkHref,
  htmlPath,
  jsReplacement,
  templates = [],
  terserOptions,
  htmlminOptions,
  cleancssOptions,
  minifySkip = false,
  deprecationWarnings
} = {}) {
  // Deprecation / migration warnings for the flat single-template API. These
  // options (and the getHtml()/htmlPath result shorthands) are removed in
  // v4.0.0, where "templates" becomes required and html outputs become a named
  // map (result.html[name]). Suppressed by deprecationWarnings: false or the
  // WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS env var.
  const usesFlatOptions = (!Array.isArray(templates) || templates.length === 0)
    && Boolean(htmlPath || jsReplacement);

  if (usesFlatOptions && deprecationsEnabled({ deprecationWarnings })) {
    log(
      'web-component-build',
      'The flat single-template options "htmlPath"/"jsReplacement" are deprecated and will be removed in v4.0.0. Migrate to the "templates" array, e.g. templates: [{ name, htmlPath, token }].',
      'warn'
    );
    log(
      'web-component-build',
      'In v4.0.0 the result\'s html surface changes from getHtml()/htmlPath to a named map: result.html[name] (each { name, path, getHtml }). Per-template cssPath/cssLinkHref overrides will also be supported.',
      'warn'
    );
  }

  // Resolve the template list. When `templates` is absent, synthesize a single
  // template from the flat options for backward compatibility.
  const resolved = (Array.isArray(templates) && templates.length > 0)
    ? templates.map((t, i) => ({
      name: t.name || (t.htmlPath ? htmlBaseName(t.htmlPath) : `template-${i}`),
      htmlPath: t.htmlPath,
      token: t.token,
      cssLinkHref: t.cssLinkHref !== undefined ? t.cssLinkHref : cssLinkHref
    }))
    : [{
      name: htmlPath ? htmlBaseName(htmlPath) : undefined,
      htmlPath,
      token: jsReplacement,
      cssLinkHref
    }];

  const hasHtmlTemplate = resolved.some(t => t.htmlPath);
  if (!jsPath && !cssPath && !hasHtmlTemplate) {
    throw new Error(
      'One of jsPath, cssPath, or htmlPath MUST be supplied to do something\n meaningful. Did you forget something?'
    );
  }

  const build = createBuild(outputDir, jsPath, cssPath, minifySkip);
  let jsText, cssText;

  if (jsPath) {
    jsText = await fs.readFile(jsPath, { encoding: 'utf8' });
  } else if (jsReplacement || resolved.some(t => t.token)) {
    throw new Error('Invalid input, a replacement token was supplied without jsPath. Did you forget \'jsPath\'?');
  }

  if (cssPath) {
    cssText = await build.minifyCss(cleancssOptions);
  }

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

  // Process each template: minify its html (with shared style/link prepended) and
  // write it, or compute an inline css/link payload when there is no html file.
  const injection = [];
  for (const template of resolved) {
    let payload;
    if (template.htmlPath) {
      const outputPath = build.addHtmlOutput(template.name);
      const sourceHtml = await fs.readFile(template.htmlPath, { encoding: 'utf8' });
      const $ = cheerio.load(sourceHtml);
      const opts = { ...(htmlminOptions || defaultHtmlMinifyOptions) };
      if (cssText) {
        $('body').prepend(`<style>${cssText}</style>`);
        opts.minifyCSS = cleancssOptions;
      }
      if (template.cssLinkHref) {
        $('body').prepend(`<link href="${template.cssLinkHref}" rel="stylesheet" />`);
      }
      payload = await build.writeHtml($('body').html(), outputPath, opts);
    } else if (cssText) {
      payload = `<style>${cssText}</style>`;
    } else if (template.cssLinkHref) {
      payload = `<link href="${template.cssLinkHref}" rel="stylesheet" />`;
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