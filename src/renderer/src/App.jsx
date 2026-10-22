import React, { useCallback, useEffect, useMemo, useState } from 'react';

const api = window.sysdash;
const EMPTY_SETTINGS = {
  theme: 'dark', refreshMs: 3000, alertsEnabled: true,
  cpuThreshold: 90, memoryThreshold: 88, diskThreshold: 92,
  sustainedSeconds: 20, minimizeToTray: false,
};

export function formatBytes(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  let n = Number(value);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (Math.abs(n) >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
const formatRate = (n) => n === null || n === undefined ? '—' : `${formatBytes(n)}/s`;
const fmtPercent = (n) => Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
const clamp = (n) => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}
const timeLabel = (t) => Number.isFinite(t) ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

function Icon({ name, size = 18, strokeWidth = 1.9, className = '' }) {
  const shapes = {
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    cpu: <><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/></>,
    memory: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4m5-4v4m5-4v4M7 18v3m5-3v3m5-3v3"/></>,
    drive: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 14h18"/><circle cx="7.5" cy="16.6" r=".7" fill="currentColor" stroke="none"/></>,
    network: <><path d="M4 8h16M4 16h16m-4-4 4 4-4 4M8 4 4 8l4 4"/></>,
    boxes: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-7"/></>,
    settings: <><path d="M12 3 13.7 5l2.6-.4.6 2.5 2.4 1.1-1 2.5 1 2.4-2.4 1.2-.6 2.5-2.6-.4L12 19l-1.7-2-2.6.4-.6-2.5-2.4-1.2 1-2.4-1-2.5 2.4-1.1.6-2.5 2.6.4L12 3Z" transform="translate(0 1)"/><circle cx="12" cy="12" r="3"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    down: <><path d="M12 3v17m-6-6 6 6 6-6"/></>,
    up: <><path d="M12 21V4m-6 6 6-6 6 6"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/></>,
    check: <><path d="m4 12 5 5L20 6"/></>,
    alert: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
    battery: <><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M7 10h6"/></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-5 0h10"/></>,
    moon: <><path d="M20 15a8 8 0 0 1-11-11A9 9 0 1 0 20 15Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    chevron: <><path d="m9 6 6 6-6 6"/></>,
    terminal: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m6 9 3 3-3 3m6 0h5"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name] || shapes.grid}</svg>;
}
function TinyLine({ data = [], color = 'teal' }) {
  const valid = data.slice(-28).filter((n) => Number.isFinite(n));
  if (valid.length < 2) return <span className="sparkline-empty">Collecting data</span>;
  const coords = valid.map((v, i) => `${(i * 100 / (valid.length - 1)).toFixed(1)},${(33 - clamp(v) * .3).toFixed(1)}`).join(' ');
  return <svg className={`sparkline spark-${color}`} viewBox="0 0 100 36" preserveAspectRatio="none" aria-label="Recent trend" role="img"><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}
function UsageBar({ value, tone = 'teal' }) {
  return <svg className="usage-bar" viewBox="0 0 100 7" preserveAspectRatio="none" aria-label={`${fmtPercent(value)} utilisation`} role="img"><rect x="0" y="0" width="100" height="7" rx="3.5" className="usage-track"/><rect x="0" y="0" width={clamp(value)} height="7" rx="3.5" className={`usage-fill ${tone}`}/></svg>;
}
function Ring({ value, tone = 'teal', label = '' }) {
  return <div className={`ring-box ring-${tone}`}><svg viewBox="0 0 100 100" role="img" aria-label={`${label} ${fmtPercent(value)}`}><circle cx="50" cy="50" r="42" className="ring-track" fill="none" strokeWidth="9"/><circle cx="50" cy="50" r="42" className="ring-progress" pathLength="100" strokeDasharray={`${clamp(value)} 100`} transform="rotate(-90 50 50)" fill="none" strokeWidth="9" strokeLinecap="round"/></svg><div className="ring-value">{Number.isFinite(value) ? `${Math.round(value)}%` : '—'}</div></div>;
}
function TrendChart({ history, range, onRange, compact = false }) {
  const [hover, setHover] = useState(null);
  const points = useMemo(() => history.filter((p) => Number.isFinite(p.t)), [history]);
  const W = 800, H = 232, left = 4, right = 796, top = 20, bottom = 208;
  const minTime = points[0]?.t ?? 0, maxTime = points[points.length - 1]?.t ?? minTime;
  const timeSpan = Math.max(1, maxTime - minTime);
  const atX = (t) => left + (t - minTime) * (right - left) / timeSpan;
  function graph(key) {
    const pairs = points.map((p) => ({ x: atX(p.t), y: bottom - clamp(p[key]) / 100 * (bottom - top), val: p[key] })).filter((x) => Number.isFinite(x.val));
    return {
      line: pairs.map((p,i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
      area: pairs.length ? `${pairs.map((p,i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L ${pairs[pairs.length - 1].x.toFixed(1)} ${bottom} L ${pairs[0].x.toFixed(1)} ${bottom} Z` : '',
    };
  }
  const cpu = graph('cpu');
  const mem = graph('memory');
  const active = points[hover ?? points.length - 1];
  return <section className={`panel trend-panel ${compact ? 'compact-panel' : ''}`}>
    <div className="panel-heading"><div><div className="eyebrow">PERFORMANCE TIMELINE</div><h3>Resource activity</h3><p>How your system has been performing over time</p></div><div className="range-picker" aria-label="Chart time range">{[['live','Live'], ['15m','15m'],['1h','1h'],['24h','24h']].map(([value,label]) => <button key={value} className={range === value ? 'selected' : ''} onClick={() => { setHover(null); onRange(value); }}>{label}</button>)}</div></div>
    <div className="chart-legend"><span><i className="legend-dot teal"/> CPU <strong>{fmtPercent(active?.cpu)}</strong></span><span><i className="legend-dot violet"/> Memory <strong>{fmtPercent(active?.memory)}</strong></span><span className="chart-time"><Icon name="clock" size={13}/> {active ? timeLabel(active.t) : 'Waiting for samples'}</span></div>
    <div className="chart-wrap">
      <div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
      <svg className="history-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="CPU and memory usage history"><defs><linearGradient id="cpuFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42e0c6" stopOpacity=".27"/><stop offset="100%" stopColor="#42e0c6" stopOpacity="0"/></linearGradient><linearGradient id="memFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9587fa" stopOpacity=".18"/><stop offset="100%" stopColor="#9587fa" stopOpacity="0"/></linearGradient></defs>
        {[20,67,114,161,208].map((y) => <line key={y} x1={0} x2={W} y1={y} y2={y} className="gridline" />)}
        <path d={mem.area} fill="url(#memFade)"/><path d={cpu.area} fill="url(#cpuFade)"/>
        <path d={mem.line} stroke="#a392ff" strokeWidth="2.7" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d={cpu.line} stroke="#42e0c6" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke"/>
        {hover !== null && points[hover] && <><line x1={atX(points[hover].t)} x2={atX(points[hover].t)} y1="20" y2="208" stroke="#9caac1" strokeDasharray="4 4" strokeOpacity=".55"/></>}
        <rect x="0" y="0" width={W} height={H} fill="transparent" onMouseMove={(e) => { if (!points.length) return; const r = e.currentTarget.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const t = minTime + x * timeSpan; let nearest = 0; for (let i = 1; i < points.length; i++) if (Math.abs(points[i].t - t) < Math.abs(points[nearest].t - t)) nearest = i; setHover(nearest); }} onMouseLeave={() => setHover(null)} />
      </svg>
    </div>
    <div className="chart-axis"><span>{points.length ? timeLabel(points[0].t) : '—'}</span><span>{points.length < 2 ? 'More samples will appear here' : `${points.length} samples displayed`}</span><span>{points.length ? timeLabel(points[points.length - 1].t) : '—'}</span></div>
  </section>;
}
function Panel({ title, kicker, action, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div>{kicker && <div className="eyebrow">{kicker}</div>}<h3>{title}</h3></div>{action}</div>{children}</section>;
}
function StatTile({ icon, title, value, detail, subdetail, tone = 'teal', trend = [] }) {
  return <article className="stat-tile"><div className="stat-head"><span className={`stat-icon ${tone}`}><Icon name={icon} size={18}/></span><span className="stat-label">{title}</span><Icon name="arrow" size={15} className="tile-arrow"/></div><div className="stat-value">{value}</div><div className="stat-bottom"><div className="stat-details"><span>{detail}</span><small>{subdetail}</small></div><TinyLine data={trend} color={tone}/></div></article>;
}
function makeInsights(snapshot) {
  const data = [];
  const cpu = snapshot?.cpu?.load, mem = snapshot?.memory?.usedPercent;
  const drive = snapshot?.storage?.[0];
  if (cpu === undefined || cpu === null || mem === undefined || mem === null) {
    data.push({ tone: 'neutral', title: 'Collecting system data', text: 'Insights become available after the first metrics sample.' });
  } else if (cpu >= 85) {
    data.push({ tone: 'warning', title: 'CPU under pressure', text: 'CPU utilisation is elevated. Check processes for potential bottlenecks.' });
  } else if (mem >= 88) {
    data.push({ tone: 'warning', title: 'Memory usage is high', text: 'Available memory is limited. Review the memory-heavy processes.' });
  } else {
    data.push({ tone: 'positive', title: 'System running smoothly', text: 'CPU and memory usage are currently below warning levels.' });
  }
  if (drive && drive.usedPercent >= 90) data.push({ tone: 'warning', title: 'Storage filling up', text: drive.sharedCapacity ? `${Math.round(drive.usedPercent)}% of APFS shared capacity is allocated (estimated).` : `${drive.name} is ${Math.round(drive.usedPercent)}% full.` });
  else if (drive) data.push({ tone: 'positive', title: 'Storage has headroom', text: `${formatBytes(drive.free)} ${drive.sharedCapacity ? 'shared APFS space' : 'space'} available on ${drive.name}.` });
  else data.push({ tone: 'neutral', title: 'Storage unavailable', text: 'This device did not return disk capacity data.' });
  return data;
}
function ProcessTable({ table, sort, onSort, compact = false }) {
  const rows = table?.list || [];
  const sorter = (key, label) => <button className={`sort-control ${sort === key ? 'active' : ''}`} onClick={() => onSort(key)}>{label} {sort === key ? '↓' : ''}</button>;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>PROCESS</th><th>PID</th><th>{sorter('cpu', 'CPU')}</th><th>{sorter('mem', 'MEMORY')}</th></tr></thead><tbody>{rows.map((p, index) => <tr key={`${p.pid}-${p.name}`}><td><div className="process-name"><span className={`process-avatar avatar-${index % 5}`}>{p.name.slice(0, 1).toUpperCase()}</span><span title={p.name}>{p.name}</span></div></td><td className="numeric-muted">{p.pid}</td><td><div className="process-load"><strong>{fmtPercent(p.cpu)}</strong><UsageBar value={p.cpu}/></div></td><td><div className="process-load"><strong>{fmtPercent(p.mem)}</strong><UsageBar value={p.mem} tone="violet"/></div></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">{table ? 'No matching processes.' : 'Loading processes…'}</div>}{!compact && table && <div className="table-foot">Showing {rows.length} of {table.matches} matching processes · {table.all} total</div>}</div>;
}
function SectionTitle({ eyebrow, title, subtitle, actions }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>;
}
function Overview({ snapshot, history, range, setRange, os, procs, onNav, sort, setSort, exportCsv, alerts }) {
  const cpu = snapshot?.cpu, memory = snapshot?.memory, storage = snapshot?.storage || [], network = snapshot?.network;
  const primaryDisk = storage[0];
  const insights = makeInsights(snapshot);
  const cpuTrend = history.map((p) => p.cpu), memTrend = history.map((p) => p.memory);
  const peakDownload = Math.max(1, ...history.map((p) => Number.isFinite(p.down) ? p.down : 0));
  const networkTrend = history.map((p) => Number.isFinite(p.down) ? p.down / peakDownload * 95 : null);
  const ready = Number.isFinite(cpu?.load) && Number.isFinite(memory?.usedPercent);
  const pressure = Number(cpu?.load) >= 85 || Number(memory?.usedPercent) >= 88 || Number(primaryDisk?.usedPercent) >= 90;
  return <>
    <SectionTitle eyebrow="OVERVIEW / SYSTEM INTELLIGENCE" title="Your system, in focus." subtitle="A clear view of everything happening on your machine, in real time." actions={<button className="button outline" onClick={exportCsv}><Icon name="download" size={16}/> Export report</button>}/>
    <section className="hero-panel"><div className="hero-copy"><div className="hero-eyebrow"><span className="live-dot"/> LIVE SYSTEM HEALTH <span className="hero-separator">/</span> {os?.hostname || 'Your machine'}</div><h2>{!ready ? 'Understanding your system…' : pressure ? 'Your system needs a little attention.' : 'Everything is looking good.'}</h2><p>{!ready ? 'Your first set of metrics is on the way.' : pressure ? 'One or more resources are running high. The insights below can help you investigate.' : 'Your core resources are within normal usage ranges. Keep an eye on the trends below.'}</p><div className="hero-pills"><span><Icon name="check" size={14}/> Local & private</span><span><Icon name="activity" size={14}/> Live telemetry</span><span><Icon name="clock" size={14}/> {snapshot ? `Updated ${timeLabel(snapshot.at)}` : 'Awaiting data'}</span></div></div><div className="hero-gauge"><div className="hero-gauge-glow"/><Ring value={cpu?.load} tone={pressure ? 'orange' : 'teal'} label="CPU"/><span>CPU LOAD</span></div></section>
    <div className="stats-grid">
      <StatTile icon="cpu" title="CPU USAGE" value={fmtPercent(cpu?.load)} detail={cpu?.brand || 'Detecting processor'} subdetail={cpu?.temperature != null ? `${cpu.temperature.toFixed(0)}°C current temperature` : `${cpu?.cores || '—'} logical cores`} trend={cpuTrend} />
      <StatTile icon="memory" title="MEMORY" value={fmtPercent(memory?.usedPercent)} detail={`${formatBytes(memory?.used)} of ${formatBytes(memory?.total)}`} subdetail={`${formatBytes(memory?.free)} available`} tone="violet" trend={memTrend}/>
      <StatTile icon="drive" title="STORAGE" value={primaryDisk ? formatBytes(primaryDisk.free) : '—'} detail="Available space" subdetail={primaryDisk ? `${Math.round(primaryDisk.usedPercent)}% ${primaryDisk.sharedCapacity ? 'shared capacity allocated (estimated)' : 'used'} on ${primaryDisk.name}` : 'Not reported'} tone="blue" trend={history.map((p) => p.disk)}/>
      <StatTile icon="network" title="NETWORK" value={formatRate(network?.down)} detail="Download speed" subdetail={`Upload ${formatRate(network?.up)}`} tone="orange" trend={networkTrend}/>
    </div>
    <div className="insights-grid"><TrendChart history={history} range={range} onRange={setRange}/><Panel title="System insights" kicker="AT A GLANCE" className="insights-panel" action={<span className={`status-chip ${!ready ? 'muted' : pressure ? 'warning' : ''}`}><i/> {!ready ? 'Checking' : pressure ? 'Attention' : 'Operational'}</span>}><div className="insight-list">{insights.map((i, index) => <div className="insight" key={index}><span className={`insight-icon ${i.tone}`}><Icon name={i.tone === 'warning' ? 'alert' : i.tone === 'positive' ? 'check' : 'info'} size={16}/></span><div><strong>{i.title}</strong><p>{i.text}</p></div></div>)}<div className="insight"><span className="insight-icon neutral"><Icon name="bell" size={16}/></span><div><strong>Performance alerts</strong><p>{alerts.length ? `${alerts.length} recent alert${alerts.length === 1 ? '' : 's'} in your activity log.` : 'No resource alerts recorded yet.'}</p></div></div></div><button className="inline-link" onClick={() => onNav('reports')}>View activity log <Icon name="arrow" size={15}/></button></Panel></div>
    <div className="below-grid"><Panel title="Top processes" kicker="RESOURCE CONSUMPTION" action={<button className="inline-link" onClick={() => onNav('processes')}>View all processes <Icon name="arrow" size={15}/></button>} className="process-panel"><ProcessTable table={procs} sort={sort} onSort={setSort} compact/></Panel><Panel title="System details" kicker="THIS DEVICE" className="details-panel"><div className="detail-rows"><div><span>Operating system</span><strong>{os?.distro || '—'}</strong></div><div><span>Architecture</span><strong>{os?.arch || '—'}</strong></div><div><span>System uptime</span><strong>{formatUptime(os?.uptime)}</strong></div><div><span>CPU cores</span><strong>{cpu?.physicalCores ?? '—'} physical / {cpu?.cores ?? '—'} logical</strong></div><div><span>Last synced</span><strong>{snapshot ? timeLabel(snapshot.at) : '—'}</strong></div></div><button className="inline-link" onClick={() => onNav('hardware')}>Explore hardware <Icon name="arrow" size={15}/></button></Panel></div>
  </>;
}
function Processes({ procs, query, setQuery, sort, setSort, direction, setDirection }) {
  return <><SectionTitle eyebrow="PROCESSES / LIVE EXPLORER" title="Process explorer" subtitle="Search your full process list and spot demanding applications."/><Panel title="All processes" kicker="LOCAL PROCESS DATA" action={<span className="status-chip"><i/>{procs?.all ?? '—'} processes</span>}><div className="table-tools"><label className="search-input"><Icon name="search" size={18}/><input placeholder="Search by application name or PID..." value={query} onChange={(e) => setQuery(e.target.value.slice(0,64))}/></label><label className="mini-select-label">Sort by <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="cpu">CPU usage</option><option value="mem">Memory usage</option><option value="name">Name</option><option value="pid">PID</option></select></label><button className="button small outline" onClick={() => setDirection(direction === 'desc' ? 'asc' : 'desc')}>{direction === 'desc' ? 'Highest first ↓' : 'Lowest first ↑'}</button></div><ProcessTable table={procs} sort={sort} onSort={(k) => { if (sort === k) setDirection(direction === 'desc' ? 'asc' : 'desc'); else { setSort(k); setDirection(k === 'name' ? 'asc' : 'desc'); } }}/><p className="privacy-caption"><Icon name="info" size={14}/> Process names and usage only. SysDash never exposes command lines, usernames, or file paths to this dashboard.</p></Panel></>;
}
function Hardware({ snapshot, os }) {
  const [showSystemVolumes, setShowSystemVolumes] = useState(false);
  const cpu = snapshot?.cpu, memory = snapshot?.memory, gpu = snapshot?.gpu || [], battery = snapshot?.battery, drives = snapshot?.storage || [], network = snapshot?.network, diskIo = snapshot?.diskIo;
  const visiblePrimaryDrives = drives.filter((d) => !d.mount.startsWith('/System/Volumes/') || d.mount === '/System/Volumes/Data');
  const visibleDrives = showSystemVolumes || visiblePrimaryDrives.length === 0 ? drives : visiblePrimaryDrives;
  return <><SectionTitle eyebrow="HARDWARE / DEEP DIVE" title="Inside your machine" subtitle="A deeper look at your processor, storage, graphics, and connectivity."/><div className="hardware-grid"><Panel title="Processor" kicker="COMPUTE"><div className="hardware-top"><Ring value={cpu?.load} label="CPU"/><div><div className="hardware-label">{cpu?.brand || 'Detecting CPU'}</div><div className="hardware-figure">{fmtPercent(cpu?.load)} <span>utilisation</span></div><p className="subtle">{cpu?.physicalCores ?? '—'} cores · {cpu?.cores ?? '—'} threads · {cpu?.speedGHz ?? '—'} GHz</p></div></div><div className="core-list">{(cpu?.perCore || []).map((v, i) => <div key={i}><span>Core {i + 1}</span><UsageBar value={v}/><b>{Math.round(v)}%</b></div>)}</div></Panel><Panel title="Memory & swap" kicker="MEMORY"><div className="hardware-top"><Ring value={memory?.usedPercent} tone="violet" label="RAM"/><div><div className="hardware-figure">{formatBytes(memory?.used)}</div><p className="subtle">of {formatBytes(memory?.total)} used</p></div></div><div className="detail-rows"><div><span>Available memory</span><strong>{formatBytes(memory?.free)}</strong></div><div><span>Swap usage</span><strong>{formatBytes(memory?.swapUsed)}</strong></div><div><span>Swap capacity</span><strong>{formatBytes(memory?.swapTotal)}</strong></div></div></Panel></div>
  <div className="hardware-grid"><Panel title="Storage volumes" kicker="FILESYSTEM"><div className="volume-list">{drives.length ? visibleDrives.map((drive) => <div className="volume" key={`${drive.name}-${drive.mount}`}><div className="volume-line"><strong><Icon name="drive" size={17}/>{drive.name}</strong><span>{formatBytes(drive.free)} {drive.sharedCapacity ? 'shared free' : 'free'}</span></div><UsageBar value={drive.usedPercent} tone={drive.usedPercent > 90 ? 'orange' : 'blue'}/><div className="volume-footer"><span>{drive.mount || drive.type || 'Volume'}</span><span>{drive.sharedCapacity ? `${formatBytes(drive.used)} on volume · ${Math.round(drive.usedPercent)}% shared capacity allocated (est.)` : `${formatBytes(drive.used)} / ${formatBytes(drive.size)} (${Math.round(drive.usedPercent)}%)`}</span></div></div>) : <div className="empty-state">Storage details unavailable on this system.</div>}</div>{drives.some((d) => d.sharedCapacity) && <p className="privacy-caption"><Icon name="info" size={14}/> macOS APFS volumes share disk capacity. Shared free space repeats across volumes and should not be added together; allocation percentages are estimates.</p>}{drives.some((d) => d.mount.startsWith('/System/Volumes/') && d.mount !== '/System/Volumes/Data') && <button className="inline-link volume-toggle" onClick={() => setShowSystemVolumes((v) => !v)}>{showSystemVolumes ? 'Hide auxiliary system volumes' : 'Show all system volumes'} <Icon name="chevron" size={14}/></button>}<div className="divider-small"/><div className="detail-rows"><div><span>Disk read</span><strong>{formatRate(diskIo?.read)}</strong></div><div><span>Disk write</span><strong>{formatRate(diskIo?.write)}</strong></div></div></Panel><Panel title="Network & graphics" kicker="CONNECTIVITY"><div className="network-dual"><div><span><Icon name="down" size={16}/> Download</span><strong>{formatRate(network?.down)}</strong></div><div><span><Icon name="up" size={16}/> Upload</span><strong>{formatRate(network?.up)}</strong></div></div><p className="subtle">Primary active interface: {network?.iface || 'Unavailable'}</p><div className="divider-small"/>{gpu.length ? gpu.map((g,i) => <div className="gpu-info" key={i}><div className="gpu-mark"><Icon name="monitor" size={18}/></div><div><strong>{g.model}</strong><p className="subtle">GPU load: {fmtPercent(g.load)} · Temperature: {Number.isFinite(g.temperature) ? `${g.temperature}°C` : 'Unavailable'}</p></div></div>) : <p className="subtle">GPU details are not available on this device.</p>}{battery?.hasBattery && <div className="battery-info"><Icon name="battery" size={18}/> Battery {fmtPercent(battery.percent)} · {battery.charging ? 'Charging' : 'On battery'}</div>}</Panel></div>
  <Panel title="Device information" kicker="SYSTEM"><div className="system-facts"><div><span>Hostname</span><strong>{os?.hostname || '—'}</strong></div><div><span>Platform</span><strong>{os?.platform || '—'}</strong></div><div><span>Operating system</span><strong>{os?.distro || '—'} {os?.release || ''}</strong></div><div><span>Architecture</span><strong>{os?.arch || '—'}</strong></div><div><span>Uptime</span><strong>{formatUptime(os?.uptime)}</strong></div></div></Panel></>;
}
function Containers({ containers, loading, onRefresh }) {
  return <><SectionTitle eyebrow="DEVELOPER / CONTAINER VISIBILITY" title="Docker workspace" subtitle="Observe local containers using Docker's read-only statistics." actions={<button className="button outline" onClick={onRefresh} disabled={loading}><Icon name="refresh" size={16}/> {loading ? 'Checking…' : 'Refresh'}</button>}/><Panel title="Local containers" kicker="DEVELOPER MODE" action={<span className={`status-chip ${!containers?.available ? 'muted' : ''}`}><i/>{containers?.available ? 'Check completed' : 'Optional integration'}</span>}>{loading && !containers ? <div className="empty-feature"><Icon name="boxes" size={30}/><h3>Checking Docker…</h3></div> : !containers?.available ? <div className="empty-feature"><div className="feature-symbol"><Icon name="boxes" size={30}/></div><h3>Docker is not available</h3><p>Start Docker Desktop or the local Docker daemon, then refresh this view. SysDash does not install Docker or need cloud access.</p></div> : !containers.rows.length ? <div className="empty-feature"><div className="feature-symbol"><Icon name="boxes" size={30}/></div><h3>No containers returned</h3><p>No local containers were returned by the monitoring library. If you expected some, check Docker Desktop and run docker ps -a in Terminal.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>CONTAINER</th><th>IMAGE</th><th>STATE</th><th>CPU</th><th>MEMORY</th></tr></thead><tbody>{containers.rows.map((c) => <tr key={c.id}><td><div className="process-name"><span className="process-avatar avatar-0"><Icon name="boxes" size={15}/></span><span>{c.name}</span></div><small className="short-id">{c.id.slice(0,12)}</small></td><td className="numeric-muted">{c.image}</td><td><span className={`state-badge ${c.state === 'running' ? 'running' : ''}`}>{c.state}</span></td><td>{fmtPercent(c.cpu)}</td><td>{formatBytes(c.memory)}<div className="small-muted">{fmtPercent(c.memoryPercent)} of limit</div></td></tr>)}</tbody></table></div>}<p className="privacy-caption"><Icon name="check" size={14}/> Read-only information. This interface cannot start, stop, delete, or execute commands in containers.</p></Panel></>;
}
function Reports({ history, range, setRange, alerts, exportCsv }) {
  const peak = (key) => { const vals = history.map((p) => p[key]).filter(Number.isFinite); return vals.length ? Math.max(...vals) : null; };
  return <><SectionTitle eyebrow="REPORTS / ACTIVITY LOG" title="Performance history" subtitle="Understand system behaviour and keep a record of notable events." actions={<button className="button primary" onClick={exportCsv}><Icon name="download" size={16}/> Export CSV</button>}/><div className="report-highlights"><div><span>PEAK CPU</span><strong>{fmtPercent(peak('cpu'))}</strong><small>Within displayed range</small></div><div><span>PEAK MEMORY</span><strong>{fmtPercent(peak('memory'))}</strong><small>Within displayed range</small></div><div><span>EVENTS RECORDED</span><strong>{alerts.length}</strong><small>Up to 100 recent alerts</small></div></div><TrendChart history={history} range={range} onRange={setRange} compact/><Panel title="Alert activity" kicker="RECENT EVENTS" action={<span className="small-muted">Most recent first</span>}>{alerts.length ? <div className="alert-rows">{alerts.map((a) => <div key={a.id} className="alert-row"><span className="insight-icon warning"><Icon name="alert" size={16}/></span><div><strong>{a.message}</strong><small>{new Date(a.at).toLocaleString()} · {a.kind?.toUpperCase()}</small></div></div>)}</div> : <div className="empty-feature short"><Icon name="check" size={26}/><h3>No alerts recorded</h3><p>Alerts will appear after resource usage stays above a configured threshold.</p></div>}</Panel><p className="privacy-caption"><Icon name="info" size={14}/> History is stored locally on this computer. The 24-hour view uses one representative sample per minute; CSV exports include recent detailed samples.</p></>;
}
function Settings({ settings, draft, setDraft, updateSettings, saving }) {
  const thresholds = [ ['cpuThreshold','CPU utilisation'],['memoryThreshold','Memory utilisation'],['diskThreshold','Storage utilisation'] ];
  return <><SectionTitle eyebrow="PREFERENCES / YOUR WORKSPACE" title="Make it yours" subtitle="Fine-tune monitoring, notifications, and the appearance of SysDash."/><div className="settings-grid"><Panel title="Appearance" kicker="PERSONALISATION"><p className="settings-desc">Choose the look of your dashboard.</p><div className="theme-picker"><button className={`theme-option ${settings.theme === 'dark' ? 'selected' : ''}`} onClick={() => updateSettings({ theme: 'dark' })}><Icon name="moon" size={19}/><span>Dark theme</span></button><button className={`theme-option ${settings.theme === 'light' ? 'selected' : ''}`} onClick={() => updateSettings({ theme: 'light' })}><Icon name="sun" size={19}/><span>Light theme</span></button></div><div className="setting-row"><div><strong>Minimise to system tray</strong><p>Keep SysDash running when the window closes.</p></div><label className="toggle"><input type="checkbox" checked={settings.minimizeToTray} onChange={(e) => updateSettings({ minimizeToTray: e.target.checked })}/><span/></label></div></Panel><Panel title="Monitoring frequency" kicker="DATA COLLECTION"><p className="settings-desc">Frequent updates are more responsive but use more system resources.</p><div className="setting-row"><div><strong>Refresh interval</strong><p>Controls how often the main process samples metrics.</p></div><select value={settings.refreshMs} onChange={(e) => updateSettings({ refreshMs: Number(e.target.value) })}><option value={2000}>2 seconds</option><option value={3000}>3 seconds</option><option value={5000}>5 seconds</option><option value={10000}>10 seconds</option></select></div><div className="setting-row"><div><strong>Saved history</strong><p>Detailed recent history and 24-hour minute snapshots.</p></div><span className="setting-value">Local only</span></div></Panel></div><Panel title="Performance alerts" kicker="NOTIFICATION RULES"><div className="setting-row"><div><strong>Enable desktop notifications</strong><p>Show native alerts after a resource remains above its threshold.</p></div><label className="toggle"><input type="checkbox" checked={settings.alertsEnabled} onChange={(e) => updateSettings({ alertsEnabled: e.target.checked })}/><span/></label></div><div className={`threshold-form ${settings.alertsEnabled ? '' : 'faded'}`}><div className="threshold-grid">{thresholds.map(([key,label]) => <label key={key}><span>{label}</span><div className="number-input"><input type="number" min="50" max="99" step="1" value={draft[key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}/><span>%</span></div></label>)}<label><span>Duration above threshold</span><select value={draft.sustainedSeconds} onChange={(e) => setDraft((d) => ({ ...d, sustainedSeconds: Number(e.target.value) }))}><option value="10">10 seconds</option><option value="20">20 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label></div><button className="button primary" disabled={saving} onClick={() => updateSettings({ cpuThreshold: Number(draft.cpuThreshold), memoryThreshold: Number(draft.memoryThreshold), diskThreshold: Number(draft.diskThreshold), sustainedSeconds: Number(draft.sustainedSeconds) })}><Icon name="check" size={15}/> {saving ? 'Saving…' : 'Save alert thresholds'}</button></div></Panel><div className="settings-foot"><Icon name="check" size={17}/> Preferences and metric history are saved only in the Electron app data folder on your device.</div></>;
}
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'processes', label: 'Processes', icon: 'cpu' },
  { id: 'hardware', label: 'Hardware', icon: 'drive' },
  { id: 'containers', label: 'Docker containers', icon: 'boxes' },
  { id: 'reports', label: 'Reports & alerts', icon: 'chart' },
];
export default function App() {
  const [view, setView] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [os, setOs] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState('live');
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [draft, setDraft] = useState(EMPTY_SETTINGS);
  const [alerts, setAlerts] = useState([]);
  const [procs, setProcs] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('cpu');
  const [direction, setDirection] = useState('desc');
  const [containers, setContainers] = useState(null);
  const [dockerLoading, setDockerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!api) { setError('Electron bridge unavailable. Run SysDash with npm run dev.'); return; }
    let active = true;
    Promise.all([api.getSettings(), api.getOs()]).then(([s, o]) => {
      if (!active) return; setSettings(s); setDraft(s); setOs(o);
    }).catch((err) => { if (active) setError(err.message); });
    const osTimer = setInterval(() => { api.getOs().then((o) => { if (active) setOs(o); }).catch(() => {}); }, 60_000);
    return () => { active = false; clearInterval(osTimer); };
  }, []);
  useEffect(() => {
    if (!api) return;
    let active = true, busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const [snap, values, eventLog] = await Promise.all([api.getOverview(), api.getHistory(range), api.getAlerts()]);
        if (active) { setSnapshot(snap); setHistory(values); setAlerts(eventLog); setError(''); }
      } catch (err) { if (active) setError(`Metrics refresh failed: ${err.message}`); }
      finally { busy = false; }
    };
    poll();
    const id = setInterval(poll, settings.refreshMs);
    return () => { active = false; clearInterval(id); };
  }, [range, settings.refreshMs]);
  useEffect(() => {
    if (!api || !['overview','processes'].includes(view)) return;
    let active = true, busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const value = await api.getProcessTable({ limit: view === 'overview' ? 6 : 200, search: view === 'overview' ? '' : query, sort, direction });
        if (active) setProcs(value);
      } catch (err) { if (active) setError(`Process lookup failed: ${err.message}`); }
      finally { busy = false; }
    };
    const debounce = setTimeout(poll, view === 'processes' ? 180 : 0);
    const interval = setInterval(poll, 8000);
    return () => { active = false; clearTimeout(debounce); clearInterval(interval); };
  }, [view, query, sort, direction]);
  const loadContainers = useCallback(async () => {
    if (!api) return;
    setDockerLoading(true);
    try { setContainers(await api.getContainers()); }
    catch { setContainers({ available: false, rows: [] }); }
    finally { setDockerLoading(false); }
  }, []);
  useEffect(() => {
    if (view !== 'containers') return;
    loadContainers();
    const id = setInterval(loadContainers, 12000);
    return () => clearInterval(id);
  }, [view, loadContainers]);
  const updateSettings = useCallback(async (patch) => {
    if (!api) return;
    setSaving(true);
    try {
      const result = await api.updateSettings(patch);
      setSettings(result); setDraft(result); setToast('Preferences saved');
    } catch (err) { setToast(`Couldn't save settings: ${err.message}`); }
    finally { setSaving(false); }
  }, []);
  const exportCsv = useCallback(async () => {
    if (!api) return;
    try { const result = await api.exportMetrics(); if (result.saved) setToast(`Saved ${result.rows} data points to ${result.filename}`); }
    catch (err) { setToast(`Export failed: ${err.message}`); }
  }, []);
  const changeSort = (key) => { if (sort === key) setDirection((d) => d === 'desc' ? 'asc' : 'desc'); else { setSort(key); setDirection('desc'); } };
  const healthy = Number.isFinite(snapshot?.cpu?.load) && Number.isFinite(snapshot?.memory?.usedPercent) && snapshot.cpu.load < 85 && snapshot.memory.usedPercent < 88;
  return <div className={`app-shell theme-${settings.theme}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-symbol"><Icon name="activity" size={23} strokeWidth={2.4}/></div><div><strong>SysDash<span className="brand-dot">.</span></strong><small>SYSTEM INTELLIGENCE</small></div></div><div className="sidebar-section">WORKSPACE</div><nav aria-label="Main navigation">{NAV_ITEMS.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}><Icon name={item.icon} size={18}/><span>{item.label}</span>{view === item.id && <span className="nav-indicator"/>}</button>)}</nav><div className="sidebar-section sidebar-tools">PREFERENCES</div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Icon name="settings" size={18}/><span>Settings</span>{view === 'settings' && <span className="nav-indicator"/>}</button><div className="sidebar-grow"/><div className="sidebar-card"><div className="sidebar-card-icon"><Icon name="activity" size={17}/></div><strong>Stay in the know.</strong><p>Understand your machine at a glance, without giving up your privacy.</p><button onClick={() => setView('reports')}>Explore reports <Icon name="arrow" size={14}/></button></div><div className="sidebar-footer"><span className="user-icon"><Icon name="monitor" size={17}/></span><div><strong>{os?.hostname || 'Your device'}</strong><small>{os?.distro || 'Local machine'}</small></div><Icon name="chevron" size={15}/></div></aside>
    <div className="workspace"><div className="topbar"><div className="breadcrumb"><span>SysDash</span><Icon name="chevron" size={14}/><strong>{[...NAV_ITEMS, {id:'settings',label:'Settings'}].find((i) => i.id === view)?.label}</strong></div><div className="topbar-right"><span className="live-status"><i className="live-dot"/> {snapshot ? 'Monitoring live' : 'Connecting'}</span><span className="top-divider"/><span className="top-time">{timeLabel(snapshot?.at)}</span><button className="top-icon" aria-label="Open alerts" onClick={() => setView('reports')}><Icon name="bell" size={18}/>{alerts.length > 0 && <i className="notification-pin"/>}</button><button className="top-icon" aria-label="Open settings" onClick={() => setView('settings')}><Icon name="settings" size={18}/></button></div></div><div className="page-content">
      {error && <div className="error-banner"><Icon name="alert" size={17}/>{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {view === 'overview' && <Overview snapshot={snapshot} history={history} range={range} setRange={setRange} os={os} procs={procs} onNav={setView} sort={sort} setSort={changeSort} exportCsv={exportCsv} alerts={alerts}/>}
      {view === 'processes' && <Processes procs={procs} query={query} setQuery={setQuery} sort={sort} setSort={setSort} direction={direction} setDirection={setDirection}/>}
      {view === 'hardware' && <Hardware snapshot={snapshot} os={os}/>}
      {view === 'containers' && <Containers containers={containers} loading={dockerLoading} onRefresh={loadContainers}/>}
      {view === 'reports' && <Reports history={history} range={range} setRange={setRange} alerts={alerts} exportCsv={exportCsv}/>}
      {view === 'settings' && <Settings settings={settings} draft={draft} setDraft={setDraft} updateSettings={updateSettings} saving={saving}/>}
      <footer className="page-footer"><span><span className={`footer-dot ${healthy ? '' : 'neutral'}`}/> {snapshot ? 'Telemetry collected locally' : 'Waiting for system metrics'}</span><span>SysDash v1.1 · Built for clarity, designed for privacy</span></footer>
    </div></div>
    {toast && <div className="toast"><Icon name="info" size={17}/>{toast}<button aria-label="Dismiss" onClick={() => setToast('')}>×</button></div>}
  </div>;
}
