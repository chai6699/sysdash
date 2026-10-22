'use strict';
const si = require('systeminformation');
const { normalizeVolumes } = require('./storageMetrics');
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const finite = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
const pct = (n) => finite(n) === null ? null : round(Math.min(100, Math.max(0, n)));

function clampLimit(limit) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.min(n, 200);
}
async function getCpu() {
  const [cpu, load, temp] = await Promise.all([si.cpu(), si.currentLoad(), si.cpuTemperature().catch(() => ({ main: null }))]);
  return {
    brand: `${cpu.manufacturer} ${cpu.brand}`.trim(),
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    speedGHz: cpu.speed,
    load: round(load.currentLoad),
    perCore: (load.cpus || []).map((c) => round(c.load)),
    temperature: temp.main ?? null,
  };
}
async function getMemory() {
  const m = await si.mem();
  return {
    total: m.total,
    used: m.active,
    free: m.available,
    usedPercent: m.total ? round((m.active / m.total) * 100) : 0,
    swapTotal: m.swaptotal,
    swapUsed: m.swapused,
  };
}
async function getProcesses(limit) {
  const max = clampLimit(limit);
  const p = await si.processes();
  const list = (p.list || []).slice().sort((a,b) => (b.cpu || 0) - (a.cpu || 0)).slice(0, max)
    // Never expose command lines, paths, usernames, or environment variables.
    .map((x) => ({ pid: x.pid, name: x.name, cpu: round(x.cpu || 0), mem: round(x.mem || 0) }));
  return { all: p.all, running: p.running, list };
}
async function getProcessTable(input = {}) {
  const opts = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const limit = clampLimit(opts.limit ?? 100);
  const search = String(opts.search || '').slice(0, 64).trim().toLowerCase();
  const sort = ['cpu', 'mem', 'name', 'pid'].includes(opts.sort) ? opts.sort : 'cpu';
  const direction = opts.direction === 'asc' ? 1 : -1;
  const p = await si.processes();
  const list = (p.list || [])
    .filter((x) => !search || String(x.name || '').toLowerCase().includes(search) || String(x.pid ?? '').includes(search))
    .slice()
    .sort((a, b) => {
      if (sort === 'name') return direction * String(a.name || '').localeCompare(String(b.name || ''));
      return direction * ((Number(a[sort]) || 0) - (Number(b[sort]) || 0));
    });
  return {
    all: p.all ?? 0,
    running: p.running ?? 0,
    matches: list.length,
    list: list.slice(0, limit).map((x) => ({
      pid: x.pid, name: String(x.name || 'Unnamed'), cpu: round(x.cpu || 0), mem: round(x.mem || 0),
    })),
  };
}
async function getOs() {
  const [os, time] = await Promise.all([si.osInfo(), Promise.resolve(si.time())]);
  return { platform: os.platform, distro: os.distro, release: os.release, arch: os.arch,
    hostname: os.hostname, uptime: time.uptime };
}
async function getStorage() {
  return normalizeVolumes(await si.fsSize());
}
async function getNetwork() {
  const items = await si.networkStats();
  const filtered = (items || []).filter((x) => !/^(lo|loopback)/i.test(String(x.iface || '')));
  const valid = filtered.length ? filtered : (items || []);
  // Do not sum virtual NIC traffic, which can double-count host activity.
  const primary = valid.slice().sort((a, b) =>
    ((finite(b.rx_sec) || 0) + (finite(b.tx_sec) || 0)) -
    ((finite(a.rx_sec) || 0) + (finite(a.tx_sec) || 0)))[0];
  return primary ? {
    iface: String(primary.iface || 'Network').slice(0, 64),
    down: finite(primary.rx_sec), up: finite(primary.tx_sec),
    received: finite(primary.rx_bytes), sent: finite(primary.tx_bytes),
  } : { iface: null, down: null, up: null, received: null, sent: null };
}
async function getDiskIo() {
  const io = await si.disksIO();
  return { read: finite(io.rBytes_sec), write: finite(io.wBytes_sec) };
}
async function getGpu() {
  const info = await si.graphics();
  return (info.controllers || []).slice(0, 4).map((x) => ({
    model: String(x.model || 'Graphics').slice(0, 100),
    vendor: String(x.vendor || '').slice(0, 80),
    vramMB: finite(x.vram),
    load: pct(x.utilizationGpu),
    temperature: finite(x.temperatureGpu),
  }));
}
async function getBattery() {
  const b = await si.battery();
  return b.hasBattery ? {
    hasBattery: true, percent: pct(b.percent), charging: Boolean(b.isCharging),
    acConnected: Boolean(b.acConnected), cycleCount: finite(b.cycleCount),
    timeRemaining: finite(b.timeRemaining),
  } : { hasBattery: false };
}
async function getContainers() {
  // Read-only Docker stats. No docker exec, Docker daemon mutation, or shell calls.
  // systeminformation handles the platform-specific local Docker socket.
  const containers = await si.dockerContainers(true);
  const running = (containers || []).filter((c) => c.state === 'running');
  let stats = [];
  if (running.length) {
    try { stats = await si.dockerContainerStats(running.map((c) => c.id).join(',')); }
    catch { /* Containers can vanish between list/stats calls. */ }
  }
  const byId = new Map((stats || []).map((s) => [s.id, s]));
  return (containers || []).slice(0, 100).map((c) => {
    const s = byId.get(c.id) || {};
    return {
      id: String(c.id || '').slice(0, 64),
      name: String(c.name || 'Container').slice(0, 100),
      image: String(c.image || '').slice(0, 120),
      state: String(c.state || 'unknown').slice(0, 32),
      status: String(c.status || '').slice(0, 80),
      cpu: finite(s.cpuPercent) === null ? null : round(s.cpuPercent), memory: finite(s.memUsage), memoryPercent: pct(s.memPercent),
    };
  });
}
module.exports = {
  getCpu, getMemory, getProcesses, getProcessTable, getOs, getStorage,
  getNetwork, getDiskIo, getGpu, getBattery, getContainers, clampLimit,
};
