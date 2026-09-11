# pure-js — javascript-only components

Some components build their DOM entirely in code (or rely on a framework at runtime). For those, pass **only** `jsPath` — no templates, no css. The build minifies the js and writes it to `output/`.

```bash
node examples/pure-js/build.mjs   # from the repo root
```

**Inputs** (`src/`)

- `counter.js` — a `<count-up>` button component; the markup is created in JS, so there's nothing to inject.

**Outputs** (`output/`, gitignored)

- `counter.js` — minified javascript. That's it: `result.cssPath` is undefined and `result.html` is an empty map.

**What to notice**

- Not every use of this library involves template injection — the same entry point handles "just minify my component js" so a build pipeline has one tool for all component shapes.
- The minimum-input validation passes because `jsPath` alone is meaningful input.
