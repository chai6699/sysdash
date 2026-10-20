'use strict';
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { registerSchemePrivileges, registerProtocolHandler } = require('./protocol');
const systemInfo = require('./systemInfo');
const { CHANNELS } = require('./channels');

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:5173';
const APP_URL = 'myapp://app/index.html';

// Must run before app 'ready'.
registerSchemePrivileges();

// Single instance + deep links (myapp://...) on Windows.
if (!app.requestSingleInstanceLock()) app.quit();
if (!isDev) app.setAsDefaultProtocolClient('myapp');

let win;

function isTrustedSender(frame) {
  if (!frame) return false;
  const url = frame.url;
  return isDev ? url.startsWith(DEV_URL) : url.startsWith('myapp://app/');
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event.senderFrame)) throw new Error('Untrusted IPC sender');
    return fn(...args);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  // No new windows, no navigating away from the app.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(isDev ? DEV_URL : 'myapp://app/')) e.preventDefault();
  });

  win.loadURL(isDev ? DEV_URL : APP_URL);
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(() => {
  registerProtocolHandler(path.join(__dirname, '..', '..', 'dist', 'renderer'));

  // Deny every permission request (camera, geolocation, notifications...).
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  handle(CHANNELS.CPU, systemInfo.getCpu);
  handle(CHANNELS.MEMORY, systemInfo.getMemory);
  handle(CHANNELS.PROCESSES, (limit) => systemInfo.getProcesses(limit));
  handle(CHANNELS.OS, systemInfo.getOs);

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Block any webview attachment.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
});
