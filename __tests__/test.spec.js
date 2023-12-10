/**
 * Web Component Build
 * 
 * Copyright (c) 2023 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
/* eslint-env jest */
import * as url from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import CleanCss from 'clean-css';
import {minify as minifyHtml} from 'html-minifier';
import {minify as minifyJs} from 'terser';
import * as cheerio from 'cheerio';
import {temporaryDirectory} from 'tempy';
import {build} from '../lib/index.js';

const jsReplacementToken = '__JS_REPLACEMENT__';
const thisDir = url.fileURLToPath(new URL('.', import.meta.url));
const outputDir = temporaryDirectory();

/**
 * Load the fixtures into structures:
 * {
 *   dir-name: {
 *     jsReplacement {Boolean}
 *     types {Array} of file-types (extensions)
 *     minifiers: {
 *       css: {asyncFunction}
 *       js: {asyncFunction}
 *       html: {asyncFunction}
 *     }
 *     file-type: { // [1..n]
 *       filePath {String}
 *       fileContent {String}
 *     }
 *   }
 * }
 * @returns {Object} of dirs and file objects described above
 */
async function loadFixtures () {
  const minifiers = {
    css: async content => new CleanCss().minify(content).styles,
    js: async (content, opts = {
      ecma: 2022
    }) => (await minifyJs(content, opts)).code,
    html: async content => minifyHtml(content, {
      minifyJS: true,
      minifyCSS: true,
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeComments: true
    })
  };
  const passThru = {
    css: async css => css,
    js: async js => js,
    html: async html => html
  }
  const fixtures = {};
  const files = await fs.readdir(path.join(thisDir, 'fixtures'), {
    recursive: true
  });

  for (const file in files) {
    const name = files[file];
    const filePath = path.join(thisDir, 'fixtures', name);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      fixtures[name] = {
        jsReplacement: false,
        types: [],
        minifiers: name.includes('passthru') ? passThru : minifiers
      };
    } else {
      const key = path.dirname(name);
      const type = path.extname(name).slice(1);
      const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
      if (!fixtures[key].jsReplacement && type === 'js') {
        fixtures[key].jsReplacement = fileContent.includes(jsReplacementToken);
      }
      fixtures[key].types.push(type);
      fixtures[key].key = key;
      fixtures[key][type] = {
        filePath,
        fileContent
      };
    }
  }

  return fixtures;
}

/**
 * Create the array of test spec objects. spec objects:
 * {
 *   name {String} The name of the fixture
 *   jsPath {String} The full path to the js fixture file
 *   outputDir {String} The outputDir for the test results
 *   options: {
 *     cssPath {String} The full path to the css fixture file
 *     htmlPath {String} The full path to the html fixture file
 *     cssLinkHref {String} The href to a css resource
 *     jsReplacement {String}
 *   }
 *   output: {
 *     css {String}
 *     js {String}
 *     html {String}
 *   }
 * }
 * @param {Object} fixtures - The object of fixtures.
 * @param {String} outputDirBase - The base output directory.
 * @returns {Array} of spec objects described above.
 */
async function makeSpecs (fixtures, outputDirBase) {
  const specs = [];
  
  for (const fixtureName in fixtures) {
    const fixture = fixtures[fixtureName];
    const outputDir = path.join(outputDirBase, fixtureName);
    const spec = {
      name: fixtureName,
      outputDir,
      options: {},
      output: {}
    };
    let link, jsStage;

    fs.mkdir(outputDir, { recursive: true });

    if (fixture.jsReplacement) {
      spec.options.jsReplacement = jsReplacementToken;
    }

    if(fixtureName.includes('passthru')) {
      spec.options.minifySkip = true;
    }

    if (fixture.types.includes('js')) {
      spec.jsPath = fixture.js.filePath;
    }
  
    if (fixture.types.includes('css')) {
      spec.options.cssPath = fixture.css.filePath;
      spec.output.css = await fixture.minifiers.css(fixture.css.fileContent);
    }
  
    if (fixture.types.includes('link')) {
      link = fixture.link.fileContent;
      const m = link.match(/href="(?<href>[^"]+)"/);
      spec.options.cssLinkHref = m?.groups?.href;
    }
  
    if (fixture.types.includes('html')) {
      spec.options.htmlPath = fixture.html.filePath;
      const $ = cheerio.load(fixture.html.fileContent);
      if (spec.output.css) {
        $('body').prepend(`<style>${spec.output.css}</style>`);
      }
      if (link) {
        $('body').prepend(link);
      }
      spec.output.html = await fixture.minifiers.html($('body').html());
    }

    if (fixture.jsReplacement) {
      if (spec.output.html) {
        let htmlOutput = spec.output.html.replace(/$/mg, '\\');
        if (htmlOutput.endsWith('\\')) {
          htmlOutput = htmlOutput.slice(0, -1);
        }
        jsStage = fixture.js.fileContent.replace(
          jsReplacementToken, htmlOutput
        );
      } else if (spec.output.css) {
        jsStage = fixture.js.fileContent.replace(
          jsReplacementToken, `<style>${spec.output.css}</style>`
        );
      } else if (link) {
        jsStage = fixture.js.fileContent.replace(
          jsReplacementToken, link
        );
      }
    }

    spec.output.js = await fixture.minifiers.js(
      jsStage || fixture.js.fileContent
    );

    specs.push(spec);
  }

  return specs;
}

const fixtures = await loadFixtures();
const specs = await makeSpecs(fixtures, outputDir);

describe('web-component-build', () => {
  afterAll(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  test.each(specs)('$name', async ({
    jsPath, outputDir, options, output
  }) => {
    const result = await build(jsPath, outputDir, options);
    expect(await result.getCssText()).toEqual(output.css);
    expect(await result.getHtmlText()).toEqual(output.html);
    expect(await result.getJsText()).toEqual(output.js);
  });
});
