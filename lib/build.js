/**
 * Web Component Build
 * Builds the component parts
 * 
 * Copyright (c) 2023 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import CleanCss from 'clean-css';
import {minify as _minifyHtml} from 'html-minifier';
import {minify as _minifyJs} from 'terser';

class WebComponentBuild {

  /**
   * Construct WebComponentBuild instance.
   *
   * @param {String} outputDir - The full path to output directory.
   * @param {String} [jsPath] - The full path to the input js file.
   * @param {String} [cssPath] - The full path to the input css file.
   * @param {String} [htmlPath] - The full path to the input html file.
   * @param {Boolean} [minifySkip] - flag to skip minification (debug), default false.
   */
  constructor (outputDir, jsPath, cssPath, htmlPath, minifySkip = false) {
    const minimumInput = jsPath || cssPath || htmlPath;

    if (!minimumInput) {
      throw new Error(
        'One of jsPath, cssPath, or htmlPath MUST be supplied to do\
 something meaningful. Did you forget something?'
      );
    }

    this.inputCssFile = cssPath;
    this.inputHtmlFile = htmlPath;
    this.inputJsFile = jsPath;
    this.outputDir = outputDir;
    this.minifySkip = minifySkip;
    
    if (jsPath) {
      this.outputJsFile = path.join(this.outputDir, path.basename(jsPath));
    }
    if (htmlPath) {
      this.outputHtmlFile = path.join(this.outputDir, path.basename(htmlPath));
    }
    if (cssPath) {
      this.outputCssFile = path.join(this.outputDir, path.basename(cssPath));
    }
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
   * Minify the given html and write it to the outputDir.
   * 
   * @param {String} htmlText - The full new html text.
   * @param {Object} options - The html-minifier options.
   * @returns {String} minified html.
   */
  async minifyHtml (htmlText, options = {
    minifyJS: true,
    minifyCSS: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeComments: true    
  }) {
    const minifiedHtml =
      this.minifySkip ? htmlText : _minifyHtml(htmlText, options);

    await fs.writeFile(this.outputHtmlFile, minifiedHtml, {
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
    const _htmlPath = this.outputHtmlFile;
    const _jsPath = this.outputJsFile;

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
      get htmlPath () {
        return _htmlPath;
      },
      async getHtml () {
        let htmlText;
        if (_htmlPath) {
          htmlText = await fs.readFile(_htmlPath, { encoding: 'utf8' });
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
      }
    };
  }
}

/**
 * Create WebComponentBuild instance.
 *
 * @param {String} cssPath - The full path to the input css file.
 * @param {String} htmlPath - The full path to the input html file.
 * @param {String} jsPath - The full path to the input js file.
 * @param {String} outputDir - The full path to output directory.
 * @param {Boolean} [minifySkip] - True to skip minifications (debug), default false.
 * @returns {WebComponentBuild} an instance of WebComponentBuild
 */
export function createBuild (
  cssPath, htmlPath, jsPath, outputDir, minifySkip = false
) {
  return new WebComponentBuild(cssPath, htmlPath, jsPath, outputDir, minifySkip);
}
