'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {
  app, BrowserWindow, ipcMain, session, dialog, Tray, Menu, Notification,
} = require('electron');
const { registerSchemePrivileges, registerProtocolHandler } = require('./protocol');
const sys = require('./systemInfo');
const { CHANNELS } = require('./channels');
const { createMetricsStore } = require('./metricsStore');
const { createSettingsStore } = require('./settings');
const { createAlertEngine } = require('./alerts');

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:5173';
const APP_URL = 'myapp://app/index.html';
registerSchemePrivileges(); // Must be registered before app.whenReady().
if (!app.requestSingleInstanceLock()) app.quit();

let win;
let tray;
let settings;
let store;
let alerts;
let quitting = false;
let cachedSlow = { storage: [], gpu: [], battery: { hasBattery: false } };
let slowUpdated = 0;
let dockerCache = { at: 0, value: null };

function isTrustedSender(frame, sender) {
  if (!frame || (sender?.mainFrame && frame !== sender.mainFrame)) return false;
  try {
    const u = new URL(frame.url);
    if (isDev) return u.origin === DEV_URL;
    return u.protocol === 'myapp:' && u.hostname === 'app' && u.port === '';
  } catch { return false; }
}
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event.senderFrame, event.sender)) throw new Error('Untrusted IPC sender');
    return fn(...args);
  });
}
const safe = async (fn, fallback) => {
  try { return await fn(); } catch { return fallback; }
};

async function collect() {
  const [cpu, memory, network, diskIo] = await Promise.all([
    safe(sys.getCpu, null), safe(sys.getMemory, null),
    safe(sys.getNetwork, { down: null, up: null, iface: null }),
    safe(sys.getDiskIo, { read: null, write: null }),
  ]);
  if (Date.now() - slowUpdated >= 15000 || !slowUpdated) {
    const [storage, gpu, battery] = await Promise.all([
      safe(sys.getStorage, []), safe(sys.getGpu, []),
      safe(sys.getBattery, { hasBattery: false }),
    ]);
    cachedSlow = { storage, gpu, battery };
    slowUpdated = Date.now();
  }
  return { cpu, memory, network, diskIo, ...cachedSlow };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 930, minWidth: 1020, minHeight: 670,
    show: false, backgroundColor: '#080d18',
    title: 'SysDash · System Intelligence',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    if (!isTrustedSender({ url: target })) event.preventDefault();
  });
  win.on('close', (e) => {
    if (!quitting && settings.get().minimizeToTray && tray) {
      e.preventDefault(); win.hide();
    }
  });
  win.on('closed', () => { win = null; });
  win.loadURL(isDev ? DEV_URL : APP_URL);
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}
function openWindow() {
  if (!win) createWindow();
  else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
}
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'assets', 'tray.png'));
    tray.setToolTip('SysDash — System Monitor');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open SysDash', click: openWindow },
      { type: 'separator' },
      { label: 'Quit SysDash', click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on('double-click', openWindow);
  } catch { tray = null; /* App remains usable even without a tray icon. */ }
}
async function getDocker() {
  if (dockerCache.value && Date.now() - dockerCache.at < 8000) return dockerCache.value;
  // Timeout only applies to the UI wait, not the underlying library call.
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 5000); });
  const result = await Promise.race([sys.getContainers(), timeout]).then(
    (rows) => ({ available: true, rows }),
    () => ({ available: false, rows: [] }),
  ).finally(() => clearTimeout(timer));
  dockerCache = { at: Date.now(), value: result };
  return result;
}

function csvCell(n) { return typeof n === 'string' ? n : Number.isFinite(n) ? String(n) : ''; }
async function exportMetrics() {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export performance history',
    defaultPath: `sysdash-performance-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV Spreadsheet', extensions: ['csv'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  });
  if (canceled || !filePath) return { saved: false };
  const series = [...store.getHistory('24h'), ...store.getHistory('1h')];
  const byTime = new Map(series.map((p) => [p.t, p]));
  const rows = Array.from(byTime.values()).sort((a,b) => a.t - b.t);
  const lines = [
    'timestamp,cpu_percent,memory_percent,disk_percent,gpu_percent,download_bytes_sec,upload_bytes_sec',
    ...rows.map((p) => [new Date(p.t).toISOString(), p.cpu, p.memory, p.disk, p.gpu, p.down, p.up].map(csvCell).join(',')),
  ];
  // Only a main-process native save dialog can select the path; renderer cannot specify it.
  await fs.promises.writeFile(filePath, lines.join('\n') + '\n', { encoding: 'utf8' });
  return { saved: true, filename: path.basename(filePath), rows: rows.length };
}

app.on('second-instance', openWindow);
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  settings = createSettingsStore(userDataPath);
  alerts = createAlertEngine({
    userDataPath, getSettings: settings.get,
    notify: (entry) => {
      if (Notification.isSupported()) new Notification({
        title: 'SysDash performance alert', body: entry.message,
      }).show();
    },
  });
  store = createMetricsStore({ collect, userDataPath, onSample: alerts.sample });
  registerProtocolHandler(path.join(__dirname, '..', '..', 'dist', 'renderer'));
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  handle(CHANNELS.CPU, sys.getCpu);
  handle(CHANNELS.MEMORY, sys.getMemory);
  handle(CHANNELS.PROCESSES, (limit) => sys.getProcesses(limit));
  handle(CHANNELS.OS, sys.getOs);
  handle(CHANNELS.OVERVIEW, () => store.getSnapshot());
  handle(CHANNELS.HISTORY, (range) => store.getHistory(['live', '15m', '1h', '24h'].includes(range) ? range : 'live'));
  handle(CHANNELS.PROCESS_TABLE, (options) => sys.getProcessTable(options));
  handle(CHANNELS.SETTINGS_GET, () => settings.get());
  handle(CHANNELS.SETTINGS_UPDATE, (changes) => {
    const next = settings.update(changes);
    store.setIntervalMs(next.refreshMs);
    return next;
  });
  handle(CHANNELS.ALERTS, () => alerts.list());
  handle(CHANNELS.CONTAINERS, getDocker);
  handle(CHANNELS.EXPORT, exportMetrics);

  createWindow();
  createTray();
  store.start(settings.get().refreshMs);
  app.on('activate', openWindow);
});
app.on('before-quit', () => { quitting = true; store?.stop(); });
app.on('window-all-closed', () => {
  if (!settings?.get().minimizeToTray && process.platform !== 'darwin') app.quit();
});
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});
