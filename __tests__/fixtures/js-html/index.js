/**
 * js-html
 * 
 * replace css in html in js
 */

class SomeComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback () {
    const { shadowRoot } = this;
    shadowRoot.innerHTML = '__JS_REPLACEMENT__';
  }
}

customElements.define('some-component', SomeComponent);