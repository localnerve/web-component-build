/**
 * A <comment-list> component authored to work WITH and WITHOUT Trusted Types
 * enforcement (CSP `require-trusted-types-for 'script'`).
 *
 * - The static template (the token in the template literal below) is
 *   author-controlled markup, so it's handed to the innerHTML sink through
 *   the component's own named policy.
 * - User-influenced values (comment text) are escaped with escapeHtml() BEFORE
 *   being composed into markup — never interpolated raw.
 * - In browsers without Trusted Types every helper degrades to a plain-string
 *   passthrough, so the same code works in dev/CDN contexts too.
 */
import { escapeHtml, trustedHtml } from '../../lib/browser/index.js';

const POLICY_NAME = 'comment-list'; // must be allowlisted: trusted-types default comment-list;

class CommentList extends HTMLElement {
  #comments = [];

  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback () {
    // The token is literal text in the template quasi (not an expression), so
    // the build replaces it with the minified css + html. Author-controlled
    // static markup -> trusted value (or passthrough string).
    const template = `__COMMENT_LIST__`;
    this.shadowRoot.innerHTML = trustedHtml(POLICY_NAME, template);
  }

  /** Add a comment. `author` and `text` are user-influenced: always escaped. */
  addComment (author, text) {
    this.#comments.push({ author, text });
    const li = document.createElement('li');
    // escapeHtml covers & < > " ' ` — safe for element content AND attributes.
    li.innerHTML = `<span class="author">${escapeHtml(author)}</span>: ${escapeHtml(text)}`;
    this.shadowRoot.querySelector('[data-comments]').append(li);
  }
}

customElements.define('comment-list', CommentList);
