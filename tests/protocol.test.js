jest.mock('electron', () => ({ protocol: {}, net: {} }), { virtual: true });
const path = require('node:path');
const { resolveRequestPath, CSP } = require('../src/main/protocol');

const root = path.resolve('/app/dist');

test('serves index.html for root', () => {
  expect(resolveRequestPath('myapp://app/', root)).toBe(path.join(root, 'index.html'));
});

test('resolves nested assets', () => {
  expect(resolveRequestPath('myapp://app/assets/x.js', root)).toBe(path.join(root, 'assets', 'x.js'));
});

test('path traversal never escapes the root', () => {
  for (const u of ['myapp://app/../../etc/passwd', 'myapp://app/%2e%2e/%2e%2e/secret', 'myapp://app/a/..%2f..%2f..%2fsecret']) {
    const r = resolveRequestPath(u, root);
    expect(r === null || r.startsWith(root + path.sep)).toBe(true);
  }
});

test('rejects wrong host or scheme', () => {
  expect(resolveRequestPath('myapp://evil/index.html', root)).toBeNull();
  expect(resolveRequestPath('https://app/index.html', root)).toBeNull();
});

test('CSP is strict', () => {
  expect(CSP).toContain("script-src 'self'");
  expect(CSP).toContain("object-src 'none'");
  expect(CSP).not.toMatch(/unsafe-(inline|eval)/);
});
