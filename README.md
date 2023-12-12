# Web Component Build

> Assembles a web component from css, html, and js parts

This library assembles a web component from its parts, allowing developers to author the component's parts in separate files. The parts are processed and written to an output directory. After processing, this library exposes the parts to a calling build process.  

The following is a table of the possible input, processing, and output combos:

| input | processing | output |
| ----- | ---------- | ------ |
| javascript | minify or optional pass-thru | javascript |
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
  // Sample usage with most optional options specified
  import {build} from 'web-component-build';
  const outputDir = 'some/path/output';

  const result = await build(outputDir, {
    cssPath: '/some/path/file.css',
    cssLinkHref: '//some/path/file.css',
    jsPath: '/some/path/file.js',
    htmlPath: '/some/path/file.html',
    jsReplacement: '__REPLACEMENT_IN_JS__',
    terserOptions: { /* terser options */ },
    htmlminOptions: { /* html-minifier options */ },
    cleancssOptions: { /* clean-css options */ }
  });
  // output written to `outputDir`
  
  // retrieve processed content
  const [js, css, html] = await Promise.all([
    result.getJs(), result.getCss(), result.getHtml()
  ]);

  // retrieve output paths
  const [jsPath, cssPath, htmlPath] = [result.jsPath, result.cssPath, result.htmlPath];
```

## Input
* `outputDir` {String} - Full path to the output directory

### Options
* `cssPath` {String} - Full path to the input css file
* `cssLinkHref` {String} - link href to a stylesheet resource to be referenced by the web component
* `jsPath` {String} - Full path to the input javascript file
* `htmlPath` {String} - Full path to the input html file
* `jsReplacement` {String} - The token to replace with the css or html in the javascript file
* `terserOptions` {Object} - The terser options object
* `htmlminOptions` {Object} - The html-minifier options object
* `cleancssOptions` {Object} - The clean-css options object
* `minifySkip` {Boolean} - True to skip all minification, defaults to false
