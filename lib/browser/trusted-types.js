/**
 * Trusted Types runtime helpers for web components.
 * 
 * Lets a component be authored so it works both with and without Trusted
 * Types enforcement (CSP `require-trusted-types-for 'script'`):
 * 
 *   - static, author-controlled markup (shadow DOM templates, static snippets)
 *     is registered once through the component's own named policy and handed
 *     to sinks as a trusted value;
 *   - dynamic, user-influenced values are escaped with escapeHtml() before
 *     being composed into markup;
 *   - in browsers without Trusted Types (or when CSP is not enforced) every
 *     helper degrades to a plain-string passthrough, so components keep
 *     working unchanged.
 * 
 * The component MUST list its policy name in the site's CSP `trusted-types`
 * directive, e.g. `trusted-types default my-component;`. A build step can
 * compute that allowlist from the sources (see @localnerve/trusted-types-rules).
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */

// per-module policy cache: a name may only be created once without the CSP
// 'allow-duplicates' keyword, so repeated calls must reuse the instance
const policies = new Map();

/**
 * Escape a value for safe interpolation into HTML markup (text or attribute).
 * 
 * @param {Any} input - The value to escape
 * @returns {String} The escaped string. null/undefined yield ''.
 */
export function escapeHtml (input) {
  if (input === null || typeof input === 'undefined') return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get (creating once) a named Trusted Type policy.
 * 
 * @param {String} name - The policy name. Must be allowlisted in the CSP trusted-types directive when enforcement is active.
 * @param {Object} [hooks] - Policy hooks. Defaults to pass-through createHTML/createScriptURL, appropriate for author-controlled content that has already been escaped where needed.
 * @returns {TrustedTypePolicy|null} The policy, or null when Trusted Types is unavailable (passthrough mode).
 */
export function getTrustedPolicy (name, hooks = {
  createHTML: input => String(input),
  createScriptURL: input => String(input)
}) {
  if (!(typeof window !== 'undefined' && 'trustedTypes' in window)) {
    return null;
  }
  if (!policies.has(name)) {
    policies.set(name, trustedTypes.createPolicy(name, hooks));
  }
  return policies.get(name);
}

/**
 * Convert author-controlled (or pre-escaped) markup into a value that is safe
 * to pass to an HTML injection sink under Trusted Types enforcement.
 * 
 * @param {String} policyName - The named policy to use (must be CSP allowlisted).
 * @param {String} html - Author-controlled or already-escaped markup.
 * @returns {TrustedHTML|String} A trusted value when enforced, otherwise the input string unchanged (passthrough for dev builds / browsers without Trusted Types).
 */
export function trustedHtml (policyName, html) {
  const policy = getTrustedPolicy(policyName);
  return policy ? policy.createHTML(html) : html;
}
