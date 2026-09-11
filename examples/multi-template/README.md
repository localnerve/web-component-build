# multi-template — several authored states, one shared stylesheet

The flagship feature: a component with **multiple HTML templates** (default / empty / error), each referenced by its own token, sharing one css file. The build script runs **both** `sharedMultiTemplate` modes into separate output dirs so you can see exactly how the shared css is distributed.

```bash
node examples/multi-template/build.mjs   # from the repo root
```

Then open [`demo.html`](./demo.html) directly in a browser (it loads the built js and iframes the standalone html outputs).

**Inputs** (`src/`)

- `grid.js` — a `<data-grid>` with three tokens, one per state.
- `default.html`, `empty.html`, `error.html` — the three authored states. Note the apostrophe in *error.html* ("Something went wrong &mdash; please try again.") — syntax-aware injection handles markup that would corrupt naive string replacement.
- `grid.css` — one shared stylesheet.

**Outputs** (`output/first/` and `output/every/`, gitignored)

- `grid.js` — identical in both modes: all three states' markup are literals inside the JS.
- `default.html` / `empty.html` / `error.html` — the per-state fragments.
  - **`"first"` (default):** only `default.html` contains the `<style>`; `empty.html` and `error.html` carry markup only. When all three states live in one shadow root (as the built component does), the css appears exactly once.
  - **`"every"`:** each html carries its own `<style>` — every output is self-contained, which matters when a template may ship alone (per-state SSR, standalone fragments).

**What to notice**

- `result.html` is a **named map**: `result.html.default`, `result.html.empty`, `result.html.error`.
- The canonical minified stylesheet is always written and exposed via `result.cssPath` / `getCss()`, regardless of mode.
- Per-template overrides: any template may set its own `cssPath` or `cssLinkHref`; those are always embedded in that template, in either mode.
