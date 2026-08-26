/**
 * UI Utility Functions
 */

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str - Unsafe string
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return String(str).replace(/[&<>"'/]/g, (s) => map[s]);
}
