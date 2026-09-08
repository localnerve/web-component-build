/**
 * Web Component Build
 * Colorized console logger + deprecation warning gate.
 * 
 * Copyright (c) 2023 - 2026 Alex Grant (@localnerve), LocalNerve LLC
 * Copyrights licensed under the BSD License. See the accompanying LICENSE file for terms.
 */
import * as path from 'node:path';

/**
 * Colorized console logger.
 *
 * @param {string} owner - The plugin/function/owner name, the named source
 * @param {string} message - The log message
 * @param {'log'|'error'|'warn'} [method='log'] - console method to use
 * @param {import('vinyl')|string} [file=null] - Vinyl file object or file/path string
 */
export function log (owner, message, method = 'log', file = null) {
  const colors = {
    magenta: '\x1b[35m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    reset: '\x1b[0m'
  };
  let filepath;
  if (file) {
    filepath = path.relative(process.cwd(), file?.path ?? file);
  }
  const now = new Date();
  const TN = i => i < 10 ? `0${i}` : i;
  const timestring = `${TN(now.getHours())}:${TN(now.getMinutes())}:${TN(now.getSeconds())}`;

  console[method](
    `[${colors.magenta}${timestring}${colors.reset}] ${owner}: ${method === 'log' ? colors.green : colors.red}${filepath ? `File ${filepath} - ` : ''}${colors.yellow}${message}${colors.reset}`
  );
}

/**
 * Determine whether deprecation warnings should be suppressed.
 *
 * Precedence (first match wins):
 *   1. options.deprecationWarnings === false  → suppress
 *   2. process.env.WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS truthy → suppress
 *   3. Otherwise → emit warnings
 *
 * @param {Object} [options] - the build() options object
 * @returns {boolean} true if deprecation warnings should be emitted
 */
export function deprecationsEnabled (options) {
  if (options && options.deprecationWarnings === false) {
    return false;
  }
  const env = process.env.WEB_COMPONENT_BUILD_NO_DEPRECATION_WARNINGS;
  if (env !== undefined && env !== '' && env !== '0' && env !== 'false') {
    return false;
  }
  return true;
}
