# pure-css — minify a stylesheet for distribution / CSP

Pass **only** `cssPath`. The build minifies the css and writes it to `output/theme.css`, exposed via `result.cssPath` / `result.getCss()`. A typical consumer of that output is a CSP hash tool (e.g. [`@localnerve/csp-hashes`](https://github.com/localnerve/csp-hashes)) or a bundler that inlines component styles.

```bash
node examples/pure-css/build.mjs   # from the repo root
```

**Inputs** (`src/`)

- `theme.css` — design tokens + badge styles for a component family.

**Outputs** (`output/`, gitignored)

- `theme.css` — minified css. No js output; `result.html` is an empty map.
