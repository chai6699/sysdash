'use strict';
const path = require('node:path');
const { protocol, net } = require('electron');
const { pathToFileURL } = require('node:url');

const SCHEME = 'myapp';

// Strict CSP sent as a real HTTP header on every app response.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

function registerSchemePrivileges() {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

/**
 * Resolve a myapp://app/<path> URL to a file inside rootDir.
 * Returns null for anything that escapes rootDir (path traversal) or wrong host.
 */
function resolveRequestPath(requestUrl, rootDir) {
  let url;
  try { url = new URL(requestUrl); } catch { return null; }
  if (url.protocol !== `${SCHEME}:` || url.host !== 'app') return null;
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const root = path.resolve(rootDir);
  const full = path.resolve(root, '.' + rel);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function registerProtocolHandler(rootDir) {
  protocol.handle(SCHEME, async (request) => {
    const file = resolveRequestPath(request.url, rootDir);
    if (!file) return new Response('Not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    headers.set('Content-Security-Policy', CSP);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers });
  });
}

module.exports = { SCHEME, CSP, registerSchemePrivileges, registerProtocolHandler, resolveRequestPath };
