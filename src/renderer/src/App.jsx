import React, { useEffect, useState, useCallback } from 'react';

const api = window.sysdash;

export const formatBytes = (b) => {
  if (!b && b !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${u[i]}`;
};

const formatUptime = (s) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

function Bar({ value }) {
  const level = value > 85 ? 'high' : value > 60 ? 'mid' : 'low';
  return (
    <div className="bar"><div className={`bar-fill ${level}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
  );
}

function Card({ title, children }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}

export default function App() {
  const [cpu, setCpu] = useState(null);
  const [mem, setMem] = useState(null);
  const [procs, setProcs] = useState(null);
  const [os, setOs] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [c, m, p] = await Promise.all([api.getCpu(), api.getMemory(), api.getProcesses(50)]);
      setCpu(c); setMem(m); setProcs(p); setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    if (!api) { setError('Bridge unavailable'); return; }
    api.getOs().then(setOs).catch((e) => setError(e.message));
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const rows = (procs?.list || []).filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <main>
      <header><h1>SysDash</h1>{error && <span className="error">{error}</span>}</header>
      <div className="grid">
        <Card title="CPU">
          {cpu ? (<>
            <p className="big">{cpu.load}%</p><Bar value={cpu.load} />
            <p className="muted">{cpu.brand} · {cpu.physicalCores}C/{cpu.cores}T · {cpu.speedGHz} GHz</p>
            <div className="cores">{cpu.perCore.map((l, i) => <div key={i} title={`Core ${i}: ${l}%`}><Bar value={l} /></div>)}</div>
          </>) : <p className="muted">Loading…</p>}
        </Card>
        <Card title="Memory">
          {mem ? (<>
            <p className="big">{mem.usedPercent}%</p><Bar value={mem.usedPercent} />
            <p className="muted">{formatBytes(mem.used)} of {formatBytes(mem.total)} used</p>
            <p className="muted">Swap: {formatBytes(mem.swapUsed)} / {formatBytes(mem.swapTotal)}</p>
          </>) : <p className="muted">Loading…</p>}
        </Card>
        <Card title="System">
          {os ? (<dl>
            <dt>OS</dt><dd>{os.distro} {os.release}</dd>
            <dt>Arch</dt><dd>{os.arch}</dd>
            <dt>Host</dt><dd>{os.hostname}</dd>
            <dt>Uptime</dt><dd>{formatUptime(os.uptime)}</dd>
          </dl>) : <p className="muted">Loading…</p>}
        </Card>
      </div>
      <Card title={`Processes${procs ? ` (${procs.all} total, ${procs.running} running)` : ''}`}>
        <input className="filter" placeholder="Filter by name…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <table>
          <thead><tr><th>PID</th><th>Name</th><th>CPU %</th><th>Mem %</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.pid}><td>{p.pid}</td><td>{p.name}</td><td>{p.cpu}</td><td>{p.mem}</td></tr>)}</tbody>
        </table>
      </Card>
    </main>
  );
}
