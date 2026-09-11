/**
 * A <data-grid> component with three authored states — default, empty, and
 * error — each referenced by its own token. The state is selected via the
 * `state` attribute ("default" | "empty" | "error").
 */

class DataGrid extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback () {
    const { shadowRoot } = this;
    // Each token is replaced at build time with that state's minified markup.
    // With sharedMultiTemplate "first" (default) only the default template
    // carries the <style>; with "every" each does.
    shadowRoot.innerHTML = `
      <div data-state="default">${'__GRID_DEFAULT__'}</div>
      <div data-state="empty">${'__GRID_EMPTY__'}</div>
      <div data-state="error">${'__GRID_ERROR__'}</div>
    `;
    this.#render();
  }

  #render () {
    const state = this.getAttribute('state') ?? 'default';
    for (const wrapper of this.shadowRoot.querySelectorAll('[data-state]')) {
      wrapper.hidden = wrapper.dataset.state !== state;
    }
  }

  static get observedAttributes () {
    return ['state'];
  }

  attributeChangedCallback () {
    if (this.shadowRoot) this.#render();
  }
}

customElements.define('data-grid', DataGrid);
