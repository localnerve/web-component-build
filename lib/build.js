/**
 * Web Component Build
 * Builds the component parts
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import CleanCss from 'clean-css';
import { minify as _minifyHtml } from 'html-minifier-terser';
import { minify as _minifyJs } from 'terser';

export const defaultHtmlMinifyOptions = {
  minifyJS: true,
  minifyCSS: true,
  collapseWhitespace: true,
  removeAttributeQuotes: true,
  removeComments: true
};

class WebComponentBuild {

  /**
   * Construct WebComponentBuild instance.
   *
   * @param {String} outputDir - The full path to output directory.
   * @param {String} [jsPath] - The full path to the input js file.
   * @param {String} [cssPath] - The full path to the input css file.
   * @param {Boolean} [minifySkip] - flag to skip minification (debug), default false.
   *
   * HTML outputs are registered dynamically via addHtmlOutput(); a component may
   * have zero or more of them (one per template).
   */
  constructor (outputDir, jsPath, cssPath, minifySkip = false) {
    // Validation of "at least one meaningful input" is owned by build(), which
    // can see the full option set (including html templates). The constructor
    // stays lenient so an html-only component is not rejected here.

    this.inputCssFile = cssPath;
    this.inputJsFile = jsPath;
    this.outputDir = outputDir;
    this.minifySkip = minifySkip;
    this.htmlOutputs = [];

    if (jsPath) {
      this.outputJsFile = path.join(this.outputDir, path.basename(jsPath));
    }
    if (cssPath) {
      this.outputCssFile = path.join(this.outputDir, path.basename(cssPath));
    }
  }

  /**
   * Register an html output file for a template.
   *
   * @param {String} baseName - The output filename without extension (e.g. "default").
   * @returns {String} The full path to the output html file.
   */
  addHtmlOutput (baseName) {
    const outputPath = path.join(this.outputDir, `${baseName}.html`);
    this.htmlOutputs.push({ name: baseName, path: outputPath });
    return outputPath;
  }

  /**
   * Minify the input css file and write it to the outputDir.
   *
   * @param {Object} options - clean-css options
   * @returns {String} minified css.
   */
  async minifyCss (options = {}) {
    const cssText = await fs.readFile(this.inputCssFile, {
      encoding: 'utf8'
    });
    
    const cleanCss =
      this.minifySkip ? cssText : new CleanCss(options).minify(cssText).styles;
  
    await fs.writeFile(this.outputCssFile, cleanCss, {
      encoding: 'utf8'
    });

    return cleanCss;
  }

  /**
   * Minify the given html and write it to a specific output file.
   *
   * @param {String} htmlText - The full new html text.
   * @param {String} outputPath - The full path to write the html to.
   * @param {Object} options - The html-minifier options.
   * @returns {String} minified html.
   */
  async writeHtml (htmlText, outputPath, options = defaultHtmlMinifyOptions) {
    const minifiedHtml =
      this.minifySkip ? htmlText : await _minifyHtml(htmlText, options);

    await fs.writeFile(outputPath, minifiedHtml, {
      encoding: 'utf8'
    });

    return minifiedHtml;
  }

  /**
   * Minify the given js and write it to the outputDir.
   * 
   * @param {String} jsText - The full new js text to process.
   * @param {Object} options - terser minification options.
   * @returns {String} minified js.
   */
  async minifyJs (jsText, options = {
    ecma: 2022
  }) {
    const minifiedJs =
      this.minifySkip ? jsText : (await _minifyJs(jsText, options)).code;
        
    await fs.writeFile(this.outputJsFile, minifiedJs, {
      encoding: 'utf8'
    });
    
    return minifiedJs;
  }

  /**
   * Get the output interface.
   * @returns {Object} An interface to access build output content.
   */
  get output () {
    const _cssPath = this.outputCssFile;
    const _jsPath = this.outputJsFile;

    const htmls = this.htmlOutputs.map(output => ({
      name: output.name,
      path: output.path,
      async getHtml () {
        return fs.readFile(output.path, { encoding: 'utf8' });
      }
    }));

    return {
      get cssPath () {
        return _cssPath;
      },
      async getCss () {
        let cssText;
        if (_cssPath) {
          cssText = await fs.readFile(_cssPath, { encoding: 'utf8' });
        }
        return cssText;
      },
      // Backward-compatible shorthands resolve to the first html output.
      get htmlPath () {
        return htmls[0] ? htmls[0].path : undefined;
      },
      async getHtml () {
        let htmlText;
        if (htmls[0]) {
          htmlText = await htmls[0].getHtml();
        }
        return htmlText;
      },
      get jsPath () {
        return _jsPath;
      },
      async getJs () {
        let jsText;
        if (_jsPath) {
          jsText = await fs.readFile(_jsPath, { encoding: 'utf8' });
        }
        return jsText;
      },
      htmls
    };
  }
}

/**
 * Create WebComponentBuild instance.
 *
 * @param {String} outputDir - The full path to the output directory.
 * @param {String} [jsPath] - The full path to the input js file.
 * @param {String} [cssPath] - The full path to the input css file.
 * @param {Boolean} [minifySkip] - True to skip minifications (debug), default false.
 * @returns {WebComponentBuild} an instance of WebComponentBuild
 */
export function createBuild (outputDir, jsPath, cssPath, minifySkip = false) {
  return new WebComponentBuild(outputDir, jsPath, cssPath, minifySkip);
}
