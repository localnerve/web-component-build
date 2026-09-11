/**
 * A simple <stat-card> web component: markup lives in index.html,
 * styles in index.css, behavior here. The replacement token (see the
 * single-quoted string below) is where the build splices the minified
 * css + html.
 */

class StatCard extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback () {
    const { shadowRoot: shadow } = this;
    // Single-quoted string literal — the build splices the minified css + html in here.
    shadow.innerHTML = '__STAT_CARD__';
    this.#render();
  }

  #render () {
    const { shadowRoot } = this;
    shadowRoot.querySelector('[data-label]').textContent = this.getAttribute('label') ?? 'Label';
    shadowRoot.querySelector('[data-value]').textContent = this.getAttribute('value') ?? '0';
  }

  static get observedAttributes () {
    return ['label', 'value'];
  }

  attributeChangedCallback () {
    if (this.shadowRoot) this.#render();
  }
}

customElements.define('stat-card', StatCard);
