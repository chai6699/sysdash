'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = Object.freeze({
  theme: 'dark', refreshMs: 3000, alertsEnabled: true,
  cpuThreshold: 90, memoryThreshold: 88, diskThreshold: 92,
  sustainedSeconds: 20, minimizeToTray: false,
});
function validateSettings(candidate = {}, previous = DEFAULTS) {
  const next = { ...previous };
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return next;
  if (candidate.theme === 'light' || candidate.theme === 'dark') next.theme = candidate.theme;
  if ([2000, 3000, 5000, 10000].includes(candidate.refreshMs)) next.refreshMs = candidate.refreshMs;
  if (typeof candidate.alertsEnabled === 'boolean') next.alertsEnabled = candidate.alertsEnabled;
  if (typeof candidate.minimizeToTray === 'boolean') next.minimizeToTray = candidate.minimizeToTray;
  for (const name of ['cpuThreshold', 'memoryThreshold', 'diskThreshold']) {
    if (Number.isInteger(candidate[name]) && candidate[name] >= 50 && candidate[name] <= 99) next[name] = candidate[name];
  }
  if ([10, 20, 30, 60].includes(candidate.sustainedSeconds)) next.sustainedSeconds = candidate.sustainedSeconds;
  return next;
}
function createSettingsStore(userDataPath) {
  const filename = path.join(userDataPath, 'sysdash-settings.json');
  let settings = { ...DEFAULTS };
  try { settings = validateSettings(JSON.parse(fs.readFileSync(filename, 'utf8'))); } catch { /* Fresh install */ }
  return {
    get: () => ({ ...settings }),
    update: (patch) => {
      settings = validateSettings(patch, settings);
      fs.mkdirSync(userDataPath, { recursive: true });
      fs.writeFileSync(filename, JSON.stringify(settings, null, 2), { mode: 0o600 });
      return { ...settings };
    },
  };
}
module.exports = { DEFAULTS, validateSettings, createSettingsStore };
