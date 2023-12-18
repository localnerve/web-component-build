# Web Component Build

> Assembles a web component from css, html, and js parts, assists user build flexibility

[![npm version](https://badge.fury.io/js/@localnerve%2Fweb-component-build.svg)](https://badge.fury.io/js/@localnerve%2Fweb-component-build)
![Verify](https://github.com/localnerve/web-component-build/workflows/Verify/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/localnerve/web-component-build/badge.svg?branch=main)](https://coveralls.io/github/localnerve/web-component-build?branch=main)

Assembles a web component from its parts, allows developers to author the component's parts in separate files.  
The parts are processed and written to an output directory, then exposed to a calling build process.  

  * [Why This Exists](#why-this-exists)
  * [Processing Possibilities](#processing-map)
  * [Usage](#usage)
  * [API](#api)
  * [Options](#options-object-optional)
  * [Result](#result-object)

## Why This Exists
  1. Author web components in separate JS, CSS, and HTML files
  2. Expose CSS for the web component to builds for computing [CSP hashes](https://github.com/localnerve/csp-hashes#readme)
  3. Expose HTML for the web component to builds for companion templates and/or DSD for SSR builds
  4. Enable/ease paying these conveniences forward in web component distribution packages

## Processing Map
The following is a table of _some_ of the possible input, processing, and output combos. See [options](#options-object-optional) for detailed explanations.

| input | processing | output |
| ----- | ---------- | ------ |
| javascript | minify javascript | javascript |
| css | minify css | css |
| html | minify html | html |
| css, html | minify css, prepend style tag to html, minify html | css, html |
| css, html, cssHref | minfy css, prepend style tag to html, prepend link tag to html, minify html | css, html |
| cssHref, html | prepend link tag to html, minify html | html |
| javascript, css | minify css, merge style tag into javascript, minify javascript | css, javascript |
| javascript, css, html | minify css, prepend style tag to html, minify html, merge into javascript, minify javascript | css, html, javascript |
| javascript, css, html, cssHref | minify css, prepend style tag to html, prepend link tag to html, minify html, merge into javascript, minify javascript | css, html, javascript |
| javascript, html | minify html, merge into javascript, minify javascript | html, javascript |
| javascript, html, cssHref | prepend link tag to html, minify html, merge into javascript, minify javascript | html, javascript |
| javascript, cssHref | add link tag to javascript, minify javascript | javascript |

> By default, html minification minifies any css found therein.

## Usage

```javascript
  // Sample usage, all options specified
  import {build} from '@localnerve/web-component-build';
  const outputDir = 'some/path/output';

  const result = await build(outputDir, {
    cssPath: '/some/path/file.css',
    cssLinkHref: '//some/path/file.css',
    jsPath: '/some/path/file.js',
    htmlPath: '/some/path/file.html',
    jsReplacement: '__REPLACEMENT_IN_JS__',
    terserOptions: { /* terser options */ },
    htmlminOptions: { /* html-minifier options */ },
    cleancssOptions: { /* clean-css options */ },
    minifySkip: false
  });
  // html, js, and css written to `outputDir`
  
  // Retrieve processed content
  const [js, css, html] = await Promise.all([
    result.getJs(), result.getCss(), result.getHtml()
  ]);

  // Retrieve output paths
  const [jsPath, cssPath, htmlPath] = [result.jsPath, result.cssPath, result.htmlPath];
```

## API
This library exports a single function that takes an output directory and processing options, returns a [result](#result-object) object.
```
build (outputDir, options): Result
```

### outputDir {String}, required
Full path to the output directory where css, html, and javascript output are written.

### Options {Object}, optional*
\* Not really. One or more of `cssPath`, `jsPath`, and/or `htmlPath` **must** be supplied. They have no default, so if no options are supplied, this library throws an exception.  

* **cssPath** {String} - Full path to the input css file  
  If supplied:  
    + css will be minified using `cleancssOptions`
    + css will be wrapped in a `style` tag
    + css will be inserted into the javascript file if `jsReplacement` and `jsPath` are supplied and no `htmlPath` supplied
    + css will be prepended to the html file if `htmlPath` is supplied
  
* **cssLinkHref** {String} - link href to a stylesheet resource to be referenced by the web component  
  If supplied:
    + href will be wrapped in a `link` tag
    + resulting `link` will be prepended to the html file if `htmlPath` supplied
    + resulting `link` will be inserted into the javascript file if no `htmlPath` supplied and `jsReplacement` and `jsPath` supplied  
  
* **htmlPath** {String} - Full path to the input html file  
  If supplied:  
    + css will be prepended in a `style` tag
    + cssLinkHref will be prepended in a `link` tag
    + html will be inserted into the javascript file if `jsReplacement` and `jsPath` is supplied  
  
* **jsPath** {String} - Full path to the input javascript file
* **jsReplacement** {String|RegExp} - The replacement pattern for the css or html in the javascript file. See [pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#pattern) for full documentation  
  If supplied:
    + A replacement will be attempted in the javascript file, `jsPath` must also be supplied
    + If **not supplied** or falsy, No replacement will be attempted and all assets are just copied to `outputDir`  
  
* **terserOptions** {Object} - The [javascript minifier options](https://github.com/terser/terser/blob/master/README.md#minify-options) object  
  Defaults:
  ```
  {
    ecma: 2022
  }
  ```  
  
* **htmlminOptions** {Object} - The [html minifier options](https://github.com/kangax/html-minifier/blob/gh-pages/README.md#options-quick-reference) object  
  Defaults:  
  ```
  {
    minifyJS: true,
    minifyCSS: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeComments: true
  }
  ```  
  
* **cleancssOptions** {Object} - The [css minifier options](https://github.com/clean-css/clean-css/blob/master/README.md#constructor-options) object  
  Defaults (same as `clean-css` defaults)  
  
* **minifySkip** {Boolean} - True to skip all minifications, defaults to false  

### Result {Object}
The output of the build process. Allows access to the output paths and full output content. Format:  
  
  + **cssPath** {String}, The full path to the output css  
  
  + **htmlPath** {String}, The full path to the output html  
  
  + **jsPath** {String}, The full path to the output javascript  
  
  + **getCss** {asyncFunction}, gets the output css  
  
  + **getHtml** {asyncFunction}, gets the output html  
  
  + **getJs** {asyncFunction}, gets the output javascript  
  
## License
  * [BSD-3 Clasuse, Alex Grant, LocalNerve](LICENSE.md)