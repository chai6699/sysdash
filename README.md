# SysDash — Secure Electron System Dashboard

Desktop app showing live CPU, memory, processes and OS details.

## Run
```bash
npm install
npm run dev      # Vite + Electron with hot reload
npm test         # Jest
npm run dist     # Windows NSIS installer -> release/
```

## Architecture
```
src/main/       main process: windows, IPC, myapp:// protocol, systeminformation
src/preload/    contextBridge API (window.sysdash) — 4 read-only methods
src/renderer/   React UI (Vite), no Node access
tests/          Jest: data mapping, protocol path safety, preload surface
```

## Security
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Preload exposes a frozen, minimal API — never `ipcRenderer` itself
- IPC handlers verify the sender frame URL before responding
- Strict CSP sent as an HTTP header by the `myapp://` handler (no `unsafe-inline`/`unsafe-eval`)
- `myapp://` handler blocks path traversal and unknown hosts
- New windows, off-app navigation, webviews and permission requests are all denied
- Process list strips command lines and usernames

## CI
`.github/workflows/build.yml` runs tests on Ubuntu, then builds the installer on `windows-latest` and uploads it as a workflow artifact. Add `CSC_LINK` / `CSC_KEY_PASSWORD` secrets to sign it.
