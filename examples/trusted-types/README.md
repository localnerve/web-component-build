# trusted-types — components that work with and without CSP Trusted Types

Uses the package's browser helpers (`escapeHtml`, `getTrustedPolicy`, `trustedHtml` — exported from `lib/browser/index.js`) to author a component that passes static, author-controlled markup through **its own named policy** and escapes all user-influenced values. In browsers without Trusted Types (or without enforcement) the helpers degrade to plain-string passthrough, so the same code runs everywhere.

```bash
node examples/trusted-types/build.mjs   # from the repo root
```

Then serve the repo root (`npx serve .`) and open `/examples/trusted-types/demo.html`. To verify enforcement, add this CSP:

```
require-trusted-types-for 'script'; trusted-types default comment-list;
```

**Inputs** (`src/`)

- `comment-list.js` — a `<comment-list>` that renders its static template via `trustedHtml(POLICY_NAME, …)` and escapes user input with `escapeHtml()` before composing markup.
- `index.html` / `index.css` — the static template and its styles.

**Outputs** (`output/`, gitignored)

- `comment-list.js` — with the `__COMMENT_LIST__` token replaced by the minified css + html payload, still importable as an ES module.
- `index.css`, `index.html` — the canonical outputs.

**What to notice**

- The build uses `minifySkip: true` on purpose: terser does not bundle, so the output must keep its relative `import` of `../../lib/browser/index.js` resolvable. In a real pipeline you'd alias that import (or inline the helpers — they're tiny and dependency-free) and minify as usual.
- The policy name (`comment-list`) **must** be allowlisted in the site's CSP `trusted-types` directive when enforcement is active. [`@localnerve/trusted-types-rules`](https://github.com/localnerve/trusted-types-rules) can compute that allowlist from your sources.
- `escapeHtml` escapes all six of `& < > " ' \`` — which is what makes the result safe in attribute values, not just element content.
