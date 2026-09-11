# Examples

Interactive examples for building web components with `@localnerve/web-component-build` (v4). Each subdirectory is self-contained: input fixtures, a `build.mjs` script, and its own README. Run any example from the repo root:

```bash
node examples/<name>/build.mjs
```

Outputs land in each example's `output/` directory (gitignored — safe to delete and regenerate). No install step is needed; the build scripts import the library from the repo root, so a fresh clone works as-is. Run `npm test` first if you want confidence that the core is healthy.

> Note: `build()` requires `outputDir` to already exist (it never creates or cleans directories — see each `build.mjs`, which calls `fs.mkdir(..., { recursive: true })` first).

| example | inputs | what it shows |
| ------- | ------ | ------------- |
| [`js-css-html`](./js-css-html/) | js, css, html | The canonical build: minified css + html injected into the component's JS token; all three outputs written. |
| [`pure-js`](./pure-js/) | js | Pure-JS components: minify only, no templates passed at all. |
| [`pure-css`](./pure-css/) | css | Pure-CSS builds: minified css output for CSP hash computation, no JS or HTML involved. |
| [`inline-style-no-html`](./inline-style-no-html/) | js, css (no html) | No `htmlPath` on the template — the minified css is injected as a bare `<style>` payload into the JS token. |
| [`link-href`](./link-href/) | js, html + `cssLinkHref` | Reference an external stylesheet with a `<link>` tag instead of inlining css (CDN distribution pattern). |
| [`multi-template`](./multi-template/) | js, css, 3× html | Several templates (default / error / empty) with one shared token each; demonstrates the `sharedMultiTemplate` option (`"first"` vs `"every"`). Includes a demo page to render the built outputs. |
| [`trusted-types`](./trusted-types/) | js + css + html | Components authored against the package's Trusted Types helpers (`escapeHtml`, `getTrustedPolicy`, `trustedHtml`) — works with and without CSP `require-trusted-types-for 'script'`. |

## Common options (every example)

Each `build.mjs` calls `build(outputDir, options)`; the full option set:

- **`jsPath`** {String} — input javascript.
- **`cssPath`** {String} — input css; minified and written as the canonical output css file.
- **`cssLinkHref`** {String} — href for a `<link rel="stylesheet">` tag (external stylesheet pattern).
- **`templates`** {Array} — html/css/link description: `{ name, htmlPath, token, cssPath?, cssLinkHref? }`. Pure-JS and pure-CSS builds pass none. See [the README](../README.md#options-object-optional) for the full API.
- **`sharedMultiTemplate`** {String} — `"first"` (default) or `"every"`: where shared css/link are embedded across templates.
- **`terserOptions`**, **`htmlminOptions`**, **`cleancssOptions`** {Object} — per-minifier options.
- **`minifySkip`** {Boolean} — `true` to skip all minification (debug).

The result exposes `jsPath`/`getJs()`, `cssPath`/`getCss()`, and `html[name]` (`{ name, path, getHtml }`) for each html template.

> **Tokens must be unique in the source file.** The injector replaces the *first* occurrence of a token string — if you write the token in a comment or log message above its real use, injection targets that instead (and throws). Pick distinctive tokens and keep them out of comments; every example follows this convention.
