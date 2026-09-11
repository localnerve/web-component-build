# link-href — reference an external stylesheet

Instead of inlining css, point `cssLinkHref` at a stylesheet resource. The build injects a `<link rel="stylesheet" href="…">` tag into the template (and into the JS token payload) instead of a `<style>` block. This is the pattern for components distributed with a CDN-hosted or separately-served stylesheet.

```bash
node examples/link-href/build.mjs   # from the repo root
```

**Inputs** (`src/`)

- `banner.js` — component behavior; token `__PROMO_BANNER__`.
- `index.html` — markup fragment.
- `banner.css` — the stylesheet itself. In a real deployment it would live on a CDN and `cssLinkHref` would be that URL; here it stays local so the demo page can load it.

**Outputs** (`output/`, gitignored)

- `banner.js` — minified JS; inspect the injected literal: it starts with `<link href="./src/banner.css" rel="stylesheet">`.
- `index.html` — minified html with the `<link>` prepended.
- No css output file (there's no `cssPath` input), and nothing was inlined.

**What to notice**

- `cssLinkHref` can be combined with `cssPath` in one build: inline a base stylesheet AND reference an external one — see the [multi-template](../multi-template/) example for per-template href overrides.
- The href is interpolated into the markup verbatim; keep it author-controlled (it's not escaped like user content).
