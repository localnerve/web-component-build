# js-css-html — the canonical build

The most common shape: a component authored as three files (js, css, html). The build minifies each, splices the minified css + html into the JS `__STAT_CARD__` token, and writes all three outputs.

```bash
node examples/js-css-html/build.mjs   # from the repo root
```

**Inputs** (`src/`)

- `card.js` — component behavior; `shadowRoot.innerHTML = '__STAT_CARD__'`.
- `index.css` — styles (becomes both the output css file AND the `<style>` injected into the html).
- `index.html` — markup fragment.

**Outputs** (`output/`, gitignored)

- `card.js` — minified JS with the token replaced by `<style>…css…</style><div class="card">…</div>`.
- `index.css` — minified css (the canonical stylesheet; useful for CSP hash computation).
- `index.html` — minified html with the `<style>` prepended.

**What to notice**

- The token lives inside a single-quoted JS string — the injector escapes the payload for that quote context, so quotes/apostrophes in the markup can't corrupt the JS.
- `result.html.index.getHtml()` returns exactly what was written to disk; the same bytes live inside the emitted JS literal.
