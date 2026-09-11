# Web Component Build

> Assembles a web component from css, html, and js parts, assists user build flexibility

[![npm version](https://badge.fury.io/js/@localnerve%2Fweb-component-build.svg)](https://badge.fury.io/js/@localnerve%2Fweb-component-build)
![Verify](https://github.com/localnerve/web-component-build/workflows/Verify/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/localnerve/web-component-build/badge.svg?branch=main)](https://coveralls.io/github/localnerve/web-component-build?branch=main)

Assembles a web component from its parts, allows developers to author the component's parts in separate files.  
The parts are processed and written to an output directory, then exposed to a calling build process.  

  * [Why This Exists](#why-this-exists)
  * [Examples](#examples)
  * [Processing Possibilities](#processing-map)
  * [Multiple Templates](#multiple-templates)
  * [Trusted Types Helpers](#trusted-types-helpers)
  * [Usage](#usage)
  * [API](#api)
  * [Options](#options-object-optional)
  * [Result](#result-object)

## Why This Exists
  1. Author web components in separate JS, CSS, and HTML files
  2. Expose CSS for the web component to builds for computing [CSP hashes](https://github.com/localnerve/csp-hashes#readme)
  3. Expose HTML for the web component to builds for companion templates and/or DSD for SSR builds
  4. Enable/ease paying these conveniences forward in web component distribution packages

## Examples
New here? The [`examples/`](./examples/) directory has seven self-contained examples — each with its own fixtures, build script, and README — covering the most common ways to build a web component with this library. Clone the repo and run any one from the root:

```bash
node examples/js-css-html/build.mjs   # the canonical js + css + html build
```

  * [js-css-html](./examples/js-css-html/) — minified css + html injected into a JS token; all three outputs written
  * [pure-js](./examples/pure-js/) — javascript-only components (no templates)
  * [pure-css](./examples/pure-css/) — minify a stylesheet for distribution / CSP hashes
  * [inline-style-no-html](./examples/inline-style-no-html/) — css injected as a bare `<style>` payload, no html file
  * [link-href](./examples/link-href/) — reference an external stylesheet with a `<link>` tag instead of inlining css
  * [multi-template](./examples/multi-template/) — several authored states (default / empty / error) and the `sharedMultiTemplate` option, with a renderable demo page
  * [trusted-types](./examples/trusted-types/) — components authored against the Trusted Types helpers, with an XSS-probe demo

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

## Templates
The `templates` array is how html (and css/link) are described to the build. A component can carry several HTML templates (e.g. default / error / empty states), each referenced by its own distinct token in the javascript:

```javascript
const result = await build(outputDir, {
  jsPath: '/some/path/file.js',
  cssPath: '/some/path/file.css',          // shared; embedding follows `sharedMultiTemplate` (default "first")
  templates: [
    { name: 'default', htmlPath: '/some/path/default.html', token: '__TPL_DEFAULT__' },
    { name: 'error',   htmlPath: '/some/path/error.html',   token: '__TPL_ERROR__' }
  ]
});
// result.html -> { default: {name, path, getHtml}, error: {...} } keyed by template name
```
Each entry takes `name` (output filename, defaults to the input basename), `htmlPath`, `token` (String or RegExp), and optional per-template `cssPath` / `cssLinkHref` overrides that fall back to the shared values. A template may omit `htmlPath` (then only its css/link payload is injected). Pure javascript or css builds pass no templates.

> By default (`sharedMultiTemplate: "first"`) the shared `cssPath`/`cssLinkHref` are embedded only in the **first** template that uses them, so several templates of one component placed into a single shadow root do not duplicate the css. Set `sharedMultiTemplate: "every"` to embed the shared styles in each template's output instead, keeping every html self-contained (needed when a template may ship alone, e.g. per-state SSR or standalone fragments). Per-template `cssPath`/`cssLinkHref` overrides are always embedded in their own template.

> Injection is **syntax-aware**: markup is spliced into the token's string/template literal with escaping for that context, so it may safely contain quotes, backticks, `${`, or backslashes.

> **Tokens MUST be unique in the javascript source.** The injector locates each token by its first occurrence in the file — if a token string also appears in a comment, a log message, or any other place, injection targets that occurrence instead (and throws when it isn't inside a string/template literal). Pick tokens that can only ever appear as the replacement placeholder (e.g. `__MY_COMPONENT_TPL__`), and don't write them anywhere else in the file.

## Trusted Types Helpers

In addition to `build`, this package exports a small set of browser runtime helpers so that web components can be authored to work **with** and **without** [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types) enforcement (CSP `require-trusted-types-for 'script'`).

```
export { escapeHtml, getTrustedPolicy, trustedHtml }
```

The idea: a component registers **its own named policy** for the static, author-controlled markup it injects into sinks (`innerHTML`, etc.), escapes any user-influenced values before composing them, and falls back to plain-string passthrough in browsers (or builds) that do not enforce Trusted Types. Import these helpers directly into your component source — they are small, dependency-free, and get tree-shaken/inlined into the final bundle at build time (a consuming component does **not** need a runtime dependency on this package).

### escapeHtml(input)
Applies the industry-standard 6-character escape — `& < > " ' \`` → `&amp; &lt; &gt; &quot; &#x27; &#x60;` — for safe interpolation into HTML markup. Escaping quotes and the backtick (not just `&lt;/&gt;`) is what makes the result safe to reuse inside an **attribute value**, not only element content (matches `he.escape`). `null`/`undefined` yield `''`. Use it for any user-influenced value before composing it into markup.
```js
import { escapeHtml } from '@localnerve/web-component-build';
const html = `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`;
// safe to interpolate into text OR a quoted attribute value
```

### getTrustedPolicy(name, hooks)
Gets (creating once) a named Trusted Type policy. A name may only be created once without the CSP `allow-duplicates` keyword, so repeated calls reuse the instance. Returns `null` when Trusted Types is unavailable (passthrough mode). The default hooks are pass-through `createHTML`/`createScriptURL`, appropriate for author-controlled content that has already been escaped where needed.
```js
import { getTrustedPolicy } from '@localnerve/web-component-build';
const policy = getTrustedPolicy('my-component'); // null if TT unavailable
```

### trustedHtml(policyName, html)
Converts author-controlled (or pre-escaped) markup into a value safe to pass to an HTML injection sink under Trusted Types enforcement. Returns a `TrustedHTML` when enforced, otherwise the input string unchanged (passthrough for dev builds / browsers without Trusted Types).
```js
import { trustedHtml } from '@localnerve/web-component-build';
shadowRoot.innerHTML = trustedHtml('my-component', '<div>…static template…</div>');
```

> The policy name must be allowlisted in the site's CSP `trusted-types` directive, e.g. `trusted-types default my-component;`. A build step can compute that allowlist from your sources — see [`@localnerve/trusted-types-rules`](https://github.com/localnerve/trusted-types-rules#readme). See [editable-object](https://github.com/localnerve/editable-object#trusted-types) for a complete, real-world example of a component built on these helpers.

## Usage

```javascript
  // Sample usage, all options specified
  import {build} from '@localnerve/web-component-build';
  const outputDir = 'some/path/output';

  const result = await build(outputDir, {
    cssPath: '/some/path/file.css',
    cssLinkHref: '//some/path/file.css',
    jsPath: '/some/path/file.js',
    templates: [
      { name: 'index', htmlPath: '/some/path/file.html', token: '__REPLACEMENT_IN_JS__' }
    ],
    terserOptions: { /* terser options */ },
    htmlminOptions: { /* html-minifier options */ },
    cleancssOptions: { /* clean-css options */ },
    minifySkip: false
  });
  // html, js, and css written to `outputDir`
  
  // Retrieve processed content
  const [js, css, html] = await Promise.all([
    result.getJs(), result.getCss(), result.html.index.getHtml()
  ]);

  // Retrieve output paths
  const [jsPath, cssPath, htmlPath] =
    [result.jsPath, result.cssPath, result.html.index.path];
```

## API
This library exports a single function that takes an output directory and processing options, returns a [result](#result-object) object.
```
build (outputDir, options): Result
```

### outputDir {String}, required
Full path to the output directory where css, html, and javascript output are written. The directory **must already exist** — `build()` throws upfront if it doesn't (or is not a directory), and never creates or cleans it itself. Creating it is the caller's job (`fs.mkdir(outputDir, { recursive: true })`); cleaning stale outputs between builds is up to your build pipeline too.

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
  
* **sharedMultiTemplate** {String} - How SHARED `cssPath`/`cssLinkHref` are embedded across templates. Defaults to `"first"`: shared styles are embedded only in the first template that uses them, so several templates of one component placed into a single shadow root do not duplicate the css (later templates carry markup only). Use `"every"` to embed the shared styles in each template's output, keeping every html self-contained (needed when a template may ship alone, e.g. per-state SSR/standalone fragments). Per-template `cssPath`/`cssLinkHref` overrides are always embedded in their own template, in either mode. Any other value throws.
  
* **jsPath** {String} - Full path to the input javascript file
* **templates** {Array} - Zero or more templates, each an object with:  
  * **name** {String} - Output filename without extension (written as `${name}.html`). Defaults to the input basename.
  * **htmlPath** {String} - Full path to the input html for this template.
  * **token** {String|RegExp} - The placeholder in the javascript to replace. See [pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#pattern). **Must be unique in the source file** — the first occurrence is the one replaced, so a token string mentioned in a comment or other literal redirects injection there.
  * **cssPath** {String} - Optional per-template css override (falls back to the shared `cssPath`).
  * **cssLinkHref** {String} - Optional per-template link href override (falls back to the shared `cssLinkHref`).  
  Shared `cssPath`/`cssLinkHref` follow the `sharedMultiTemplate` mode: embedded in the first template that uses them by default (`"first"`), or in every template when `sharedMultiTemplate: "every"`. Per-template overrides are always embedded in their own template. A token with no `jsPath` throws, as do duplicate resolved output names and invalid `sharedMultiTemplate` values. The flat `htmlPath`/`jsReplacement` options were removed in v4 and now throw a migration error.
  
* **terserOptions** {Object} - The [javascript minifier options](https://github.com/terser/terser/blob/master/README.md#minify-options) object  
  Defaults:
  ```
  {
    ecma: 2022
  }
  ```  
  
* **htmlminOptions** {Object} - The [html minifier options](https://github.com/terser/html-minifier-terser?tab=readme-ov-file#options-quick-reference) object  
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

* **deprecationWarnings** {Boolean} - False to disable deprecation warnings, defaults to true. If omitted, deprecation warnings are suppressed by defining environment variable `WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS`

### Result {Object}
The output of the build process. Allows access to the output paths and full output content. Format:  
  
  + **cssPath** {String}, The full path to the output css  
  
  + **jsPath** {String}, The full path to the output javascript  
  
  + **getCss** {asyncFunction}, gets the output css  
  
  + **getJs** {asyncFunction}, gets the output javascript  
  
  + **html** {Object}, A map keyed by template name. Each entry: `{ name, path, getHtml }` where `path` is the full path to that template's output html and `getHtml` (async) returns its content.
  
## License
  * [BSD-3 Clasuse, Alex Grant, LocalNerve](LICENSE.md)