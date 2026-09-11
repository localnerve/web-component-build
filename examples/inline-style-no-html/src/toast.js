/**
 * A <toast> component: the markup is written imperatively in JS, so there is
 * no html file to build. But it still needs styles — pass a template with NO
 * htmlPath and the minified css is injected into the token as a bare
 * '<style>…</style>' payload.
 */

class Toast extends HTMLElement {
  connectedCallback () {
    const message = this.getAttribute('message') ?? 'Hello!';
    // The replacement token below (literal text, not an expression) becomes
    // <style>…minified css…</style> at build time; ${message} stays a runtime
    // interpolation. Note: the attribute value is author-controlled here — for
    // user input, escape it first (see the trusted-types example).
    this.innerHTML = `__TOAST_CSS__<div class="toast" role="status">${message}</div>`;
  }
}

customElements.define('toast', Toast);
