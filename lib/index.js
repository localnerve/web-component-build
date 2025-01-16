/**
 * Web Component Build
 * Assemble and minify a web component from its parts.
 * Expose parts back to the calling build process.
 * 
 * Copyright (c) 2023 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as fs from 'node:fs/promises';
import * as cheerio from 'cheerio';
import {createBuild, defaultHtmlMinifyOptions} from './build.js';

/**
 * Build entry point.
 *
 * @param {String} outputDir - full path to the output directory
 * @param {Object} [options] - optional options
 * @param {String} [options.jsPath] - full path to the javascript file
 * @param {String} [options.cssPath] - full path to the input css file
 * @param {String} [options.cssLinkHref] - http href to css resource
 * @param {String} [options.htmlPath] - full path to the input html file
 * @param {String} [options.jsReplacement] - Replacement token in the js file
 * @param {Object} [options.terserOptions] - Js minifier options (terser)
 * @param {Object} [options.htmlminOptions] - html-minifier options
 * @param {Object} [options.cleancssOptions] - clean-css options
 * @param {Boolean} [options.minifySkip] - default false, flag to skip all minification (debug)
 * @returns {Object} Interface to getCss, getHtml, getJs for further processing
 */
export async function build (outputDir, {
  jsPath,
  cssPath,
  cssLinkHref,
  htmlPath,
  jsReplacement,
  terserOptions,
  htmlminOptions,
  cleancssOptions,
  minifySkip = false
} = {}) {
  const build = createBuild(outputDir, jsPath, cssPath, htmlPath, minifySkip);
  let jsText, cssText, htmlText;

  if (jsPath) {
    jsText = await fs.readFile(jsPath, { encoding: 'utf8' });
  } else if (jsReplacement) {
    throw new Error('Invalid input, jsReplacement supplied without jsPath. Did you forget \'jsPath\'?');
  }

  if (cssPath) {
    cssText = await build.minifyCss(cleancssOptions);
  }

  if (htmlPath) {
    htmlText = await fs.readFile(htmlPath, { encoding: 'utf8' });
    const $ = cheerio.load(htmlText);
    if (cssText) {
      $('body').prepend(`<style>${cssText}</style>`);
      htmlminOptions = htmlminOptions || defaultHtmlMinifyOptions;
      htmlminOptions.minifyCSS = cleancssOptions;
    }
    if (cssLinkHref) {
      $('body').prepend(`<link href="${cssLinkHref}" rel="stylesheet" />`);
    }
    htmlText = await build.minifyHtml($('body').html(), htmlminOptions);
  }

  if (jsReplacement) {
    if (htmlText) {
      htmlText = htmlText.replace(/$/mg, '\\');
      if (htmlText.endsWith('\\')) {
        htmlText = htmlText.slice(0, -1);
      }
      jsText = jsText.replace(jsReplacement, htmlText);
    } else if (cssText) {
      jsText = jsText.replace(jsReplacement, `<style>${cssText}</style>`);
    } else if (cssLinkHref) {
      jsText = jsText.replace(
        jsReplacement, `<link href="${cssLinkHref}" rel="stylesheet" />`
      );
    }
  }

  if (jsText) {
    await build.minifyJs(jsText, terserOptions);
  }

  return build.output;
}