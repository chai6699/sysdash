'use strict';
const fs = require('node:fs');
const path = require('node:path');
const MS_PER_MINUTE = 60_000;
const MAX_RECENT = 1800;  // Up to 1 hour at 2-second sampling.
const MAX_ARCHIVE = 1440; // Up to 24 hours, 1 sample/minute.

function toPoint(snapshot) {
  return {
    t: snapshot.at,
    cpu: snapshot.cpu?.load ?? null,
    memory: snapshot.memory?.usedPercent ?? null,
    disk: snapshot.storage?.[0]?.usedPercent ?? null,
    gpu: snapshot.gpu?.[0]?.load ?? null,
    down: snapshot.network?.down ?? null,
    up: snapshot.network?.up ?? null,
  };
}
function slim(points, max = 130) {
  if (points.length <= max) return points;
  const result = [];
  for (let i = 0; i < max; i++) result.push(points[Math.round(i * (points.length - 1) / (max - 1))]);
  return result;
}
function createMetricsStore({ collect, userDataPath, clock = Date.now, onSample = () => {} }) {
  const file = path.join(userDataPath, 'sysdash-history.json');
  let archive = [];
  try {
    const old = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(old)) archive = old.filter((p) => Number.isFinite(p.t) && p.t > clock() - 86_400_000).slice(-MAX_ARCHIVE);
  } catch { /* No persisted history yet */ }
  const recent = [];
  let snapshot = null;
  let flight = null;
  let timeout = null;
  let stopped = false;
  let currentInterval = 3000;
  let lastWrittenBucket = archive.length ? Math.floor(archive[archive.length - 1].t / MS_PER_MINUTE) : -1;

  async function tick() {
    if (flight) return flight;
    flight = (async () => {
      const next = await collect();
      snapshot = { ...next, at: clock() };
      const point = toPoint(snapshot);
      recent.push(point);
      if (recent.length > MAX_RECENT) recent.shift();
      const bucket = Math.floor(point.t / MS_PER_MINUTE);
      if (bucket !== lastWrittenBucket) {
        archive.push(point); // One representative sample per minute (not an average).
        archive = archive.filter((p) => p.t > clock() - 86_400_000).slice(-MAX_ARCHIVE);
        lastWrittenBucket = bucket;
        try {
          fs.mkdirSync(userDataPath, { recursive: true });
          fs.writeFileSync(file, JSON.stringify(archive), { mode: 0o600 });
        } catch { /* Monitoring works even if persistence is unavailable. */ }
      }
      try { onSample(snapshot); } catch { /* Alerts may fail; sampling must continue. */ }
      return snapshot;
    })().finally(() => { flight = null; });
    return flight;
  }
  function schedule() {
    if (stopped) return;
    timeout = setTimeout(async () => {
      try { await tick(); } catch { /* Keep polling after an intermittent read error. */ }
      schedule();
    }, currentInterval);
  }
  return {
    async getSnapshot() { return snapshot || tick(); },
    getHistory(range = 'live') {
      const now = clock();
      const windows = { live: 60_000, '15m': 900_000, '1h': 3_600_000, '24h': 86_400_000 };
      const windowMs = windows[range] || windows.live;
      const series = range === '24h' ? archive : recent;
      return slim(series.filter((p) => p.t >= now - windowMs));
    },
    start(interval = 3000) {
      stopped = false;
      currentInterval = interval;
      // Sample immediately; future ticks are serial and cannot overlap.
      tick().catch(() => {}).finally(schedule);
    },
    setIntervalMs(interval) {
      currentInterval = interval;
      if (timeout) { clearTimeout(timeout); schedule(); }
    },
    stop() { stopped = true; if (timeout) clearTimeout(timeout); },
    tick,
  };
}
module.exports = { createMetricsStore, toPoint, slim };
