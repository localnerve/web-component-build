/**
 * js-passthru
 */
/* eslint-env browser */
class SomeComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback () {
    const { shadowRoot } = this;
    shadowRoot.innerHTML = '<style>.something { position: fixed; }</style>\
<div class="something">\
</div>';
  }
}

customElements.define('some-component', SomeComponent);