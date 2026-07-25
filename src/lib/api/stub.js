/** Throws a clear message when http mode is on but the endpoint is not wired yet. */
export function apiNotImplemented(service, method, hint = '') {
  const msg = `[API] ${service}.${method} is not implemented.${hint ? ` ${hint}` : ''}`;
  const err = new Error(msg);
  err.code = 'API_NOT_IMPLEMENTED';
  throw err;
}
