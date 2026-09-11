/**
 * A <count-up> component built entirely in javascript — no html or css files.
 * The build still minifies the js; nothing else is passed to it.
 */

class CountUp extends HTMLElement {
  #count = 0;

  connectedCallback () {
    this.innerHTML = `
      <button type="button" aria-label="increment">0</button>
    `;
    const button = this.querySelector('button');
    button.addEventListener('click', () => {
      this.#count += 1;
      button.textContent = String(this.#count);
      this.dispatchEvent(new CustomEvent('count-change', { detail: { count: this.#count } }));
    });
  }

  get count () {
    return this.#count;
  }
}

customElements.define('count-up', CountUp);
