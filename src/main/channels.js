'use strict';
// Preload duplicates these strings because sandboxed preloads cannot require app modules.
const CHANNELS = Object.freeze({
  CPU: 'sys:cpu',
  MEMORY: 'sys:memory',
  PROCESSES: 'sys:processes',
  OS: 'sys:os',
  OVERVIEW: 'sys:overview',
  HISTORY: 'sys:history',
  PROCESS_TABLE: 'sys:process-table',
  SETTINGS_GET: 'sys:settings-get',
  SETTINGS_UPDATE: 'sys:settings-update',
  ALERTS: 'sys:alerts',
  CONTAINERS: 'sys:containers',
  EXPORT: 'sys:export',
});
module.exports = { CHANNELS };
