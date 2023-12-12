/**
 * js-css-html
 * 
 * replace css in html in js
 */
/* eslint-env browser */

class SomeComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback () {
    const { shadowRoot, template } = this;
    const templateNode = document.getElementById(template);
    shadowRoot.innerHTML = '';
    if (templateNode) {
      const content = document.importNode(templateNode.content, true);
      shadowRoot.appendChild(content);
    } else {
      shadowRoot.innerHTML = '<span>Could not find external template</span>';
    }
  }
}

customElements.define('some-component', SomeComponent);