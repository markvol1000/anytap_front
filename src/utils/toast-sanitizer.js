/**
 * Sanitizes toast and error messages before display to users/UI.
 * Replaces internal provider names ("wasabi", "wasabicard", "cregis") with "System".
 */
export function sanitizeToastMessage(msg) {
  if (!msg || typeof msg !== 'string') return msg;
  return msg
    .replace(/wasabi\s*card/gi, 'System')
    .replace(/wasabicard/gi, 'System')
    .replace(/wasabi/gi, 'System')
    .replace(/cregis/gi, 'System');
}
