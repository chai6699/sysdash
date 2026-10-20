'use strict';
const si = require('systeminformation');

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

function clampLimit(limit) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.min(n, 200);
}

async function getCpu() {
  const [cpu, load, temp] = await Promise.all([si.cpu(), si.currentLoad(), si.cpuTemperature()]);
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
  const list = (p.list || [])
    .slice()
    .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
    .slice(0, max)
    // Only expose non-sensitive fields: no command lines, paths or users.
    .map((x) => ({ pid: x.pid, name: x.name, cpu: round(x.cpu || 0), mem: round(x.mem || 0) }));
  return { all: p.all, running: p.running, list };
}

async function getOs() {
  const [os, time] = await Promise.all([si.osInfo(), Promise.resolve(si.time())]);
  return {
    platform: os.platform,
    distro: os.distro,
    release: os.release,
    arch: os.arch,
    hostname: os.hostname,
    uptime: time.uptime,
  };
}

module.exports = { getCpu, getMemory, getProcesses, getOs, clampLimit };
