'use strict';
// Sandboxed preload: the limited Electron require cannot load local app modules.
const { contextBridge, ipcRenderer } = require('electron');
const CH = {
  CPU: 'sys:cpu', MEMORY: 'sys:memory', PROCESSES: 'sys:processes', OS: 'sys:os',
  OVERVIEW: 'sys:overview', HISTORY: 'sys:history', PROCESS_TABLE: 'sys:process-table',
  SETTINGS_GET: 'sys:settings-get', SETTINGS_UPDATE: 'sys:settings-update',
  ALERTS: 'sys:alerts', CONTAINERS: 'sys:containers', EXPORT: 'sys:export',
};
const api = Object.freeze({
  getCpu: () => ipcRenderer.invoke(CH.CPU),
  getMemory: () => ipcRenderer.invoke(CH.MEMORY),
  getProcesses: (limit = 25) => ipcRenderer.invoke(CH.PROCESSES, Number(limit) || 25),
  getOs: () => ipcRenderer.invoke(CH.OS),
  getOverview: () => ipcRenderer.invoke(CH.OVERVIEW),
  getHistory: (range = 'live') => ipcRenderer.invoke(CH.HISTORY, String(range)),
  getProcessTable: (options = {}) => ipcRenderer.invoke(CH.PROCESS_TABLE, options),
  getSettings: () => ipcRenderer.invoke(CH.SETTINGS_GET),
  updateSettings: (changes) => ipcRenderer.invoke(CH.SETTINGS_UPDATE, changes),
  getAlerts: () => ipcRenderer.invoke(CH.ALERTS),
  getContainers: () => ipcRenderer.invoke(CH.CONTAINERS),
  exportMetrics: () => ipcRenderer.invoke(CH.EXPORT),
});
contextBridge.exposeInMainWorld('sysdash', api);
