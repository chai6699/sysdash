'use strict';
// Sandboxed preload: only `electron` and a few built-ins may be required,
// so channel names are inlined (keep in sync with src/main/channels.js).
const { contextBridge, ipcRenderer } = require('electron');

const CH = { CPU: 'sys:cpu', MEMORY: 'sys:memory', PROCESSES: 'sys:processes', OS: 'sys:os' };

// Narrow, read-only API. The renderer never sees ipcRenderer itself.
const api = Object.freeze({
  getCpu: () => ipcRenderer.invoke(CH.CPU),
  getMemory: () => ipcRenderer.invoke(CH.MEMORY),
  getProcesses: (limit = 25) => ipcRenderer.invoke(CH.PROCESSES, Number(limit) || 25),
  getOs: () => ipcRenderer.invoke(CH.OS),
});

contextBridge.exposeInMainWorld('sysdash', api);
