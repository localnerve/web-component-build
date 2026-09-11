/**
 * A <promo-banner> component whose styles live on a CDN (or any external
 * origin) rather than inlined. The build injects a <link rel="stylesheet">
 * tag into the template instead of a <style> block.
 */

class PromoBanner extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback () {
    this.shadowRoot.innerHTML = '__PROMO_BANNER__';
    const heading = this.getAttribute('heading') ?? 'Announcement';
    this.shadowRoot.querySelector('[data-heading]').textContent = heading;
  }
}

customElements.define('promo-banner', PromoBanner);
