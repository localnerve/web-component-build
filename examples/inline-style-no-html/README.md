# inline-style-no-html — styles without an html file

A component that builds its DOM in code still needs css. Pass a template **without** `htmlPath`: the minified css is injected into the token as a bare `<style>…</style>` payload, and no html output file is written for it.

```bash
node examples/inline-style-no-html/build.mjs   # from the repo root
```

**Inputs** (`src/`)

- `toast.js` — builds its markup in JS; token `__TOAST_CSS__` sits inside a template literal.
- `toast.css` — styles for the toast.

**Outputs** (`output/`, gitignored)

- `toast.js` — minified JS where the token is replaced with `<style>…minified css…</style>` (look at the emitted code — the style payload is spliced right before the toast markup).
- `toast.css` — the canonical minified stylesheet.
- No html file: `result.html` has no entry for `inline`.

**What to notice**

- The token lives in a **template literal** here (vs a single-quoted string in the js-css-html example) — escaping adapts to each quote context automatically.
- This is the pattern for "JS-templated" components that still want build-time minified css.
