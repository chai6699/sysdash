'use strict';
// Single source of truth for IPC channel names (shared by main + preload).
const CHANNELS = Object.freeze({
  CPU: 'sys:cpu',
  MEMORY: 'sys:memory',
  PROCESSES: 'sys:processes',
  OS: 'sys:os',
});
module.exports = { CHANNELS };
