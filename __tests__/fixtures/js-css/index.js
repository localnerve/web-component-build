/**
 * js-css
 * replace css in js
 */

class SomeComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback () {
    const { shadowRoot } = this;
    shadowRoot.innerHTML = '__JS_REPLACEMENT__\
<div class="something">\
</div>';
  }
}

customElements.define('some-component', SomeComponent);