'use strict';
const fs = require('node:fs');
const path = require('node:path');
const COOLDOWN_MS = 5 * 60_000;
function createAlertEngine({ userDataPath, getSettings, notify = () => {}, clock = Date.now }) {
  const filename = path.join(userDataPath, 'sysdash-alerts.json');
  let history = [];
  try {
    const old = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (Array.isArray(old)) history = old.slice(-100);
  } catch { /* No alert log yet */ }
  const activeSince = {};
  const lastFired = {};
  function sample(snapshot) {
    const settings = getSettings();
    if (!settings.alertsEnabled) { for (const key of Object.keys(activeSince)) delete activeSince[key]; return; }
    const metrics = [
      { key: 'cpu', value: snapshot.cpu?.load, limit: settings.cpuThreshold, title: 'CPU utilisation' },
      { key: 'memory', value: snapshot.memory?.usedPercent, limit: settings.memoryThreshold, title: 'Memory utilisation' },
      { key: 'disk', value: snapshot.storage?.[0]?.usedPercent, limit: settings.diskThreshold, title: 'Disk utilisation' },
    ];
    const now = clock();
    for (const m of metrics) {
      if (!Number.isFinite(m.value) || m.value < m.limit) { delete activeSince[m.key]; continue; }
      if (activeSince[m.key] === undefined) activeSince[m.key] = now;
      if (now - activeSince[m.key] < settings.sustainedSeconds * 1000) continue;
      if (lastFired[m.key] && now - lastFired[m.key] < COOLDOWN_MS) continue;
      lastFired[m.key] = now;
      const entry = {
        id: `${m.key}-${now}`, at: now, kind: m.key, value: Math.round(m.value),
        threshold: m.limit, message: `${m.title} sustained at ${Math.round(m.value)}% (limit ${m.limit}%)`,
      };
      history = [...history, entry].slice(-100);
      try { fs.mkdirSync(userDataPath, { recursive: true }); fs.writeFileSync(filename, JSON.stringify(history), { mode: 0o600 }); } catch { /* no disk available */ }
      try { notify(entry); } catch { /* native notifications are optional */ }
    }
  }
  return { sample, list: () => history.slice().reverse() };
}
module.exports = { createAlertEngine };
