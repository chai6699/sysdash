const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateSettings, DEFAULTS, createSettingsStore } = require('../src/main/settings');
const { createMetricsStore } = require('../src/main/metricsStore');
const { createAlertEngine } = require('../src/main/alerts');
let folder;
beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), 'sysdash-test-')); });
afterEach(() => fs.rmSync(folder, { recursive: true, force: true }));

test('settings reject unexpected fields and out-of-range thresholds', () => {
  expect(validateSettings({ cpuThreshold: 123, theme: 'unknown', command: 'rm -rf /' })).toEqual(DEFAULTS);
  expect(validateSettings({ cpuThreshold: 75, theme: 'light', refreshMs: 5000 })).toMatchObject({ cpuThreshold: 75, theme: 'light', refreshMs: 5000 });
  expect(Object.keys(validateSettings({ command: 'bad' }))).not.toContain('command');
});
test('settings persist validated preferences locally', () => {
  const store = createSettingsStore(folder);
  store.update({ theme: 'light', alertsEnabled: false });
  expect(createSettingsStore(folder).get()).toMatchObject({ theme: 'light', alertsEnabled: false });
});
test('metrics history is bounded and can be requested by range', async () => {
  let now = 1_800_000_000_000;
  const collect = jest.fn().mockResolvedValue({ cpu: { load: 23 }, memory: { usedPercent: 52 }, network: { down: 0, up: 0 } });
  const metrics = createMetricsStore({ collect, userDataPath: folder, clock: () => now });
  await metrics.tick(); now += 30_000; await metrics.tick(); now += 32_000; await metrics.tick();
  expect(collect).toHaveBeenCalledTimes(3);
  expect(metrics.getHistory('live').length).toBe(2);
  expect(metrics.getHistory('24h').length).toBe(2);
  expect(metrics.getHistory('1h')[0].cpu).toBe(23);
  metrics.stop();
});
test('resource alerts fire only after sustained duration', () => {
  let now = 1_800_000_000_000;
  const notify = jest.fn();
  const engine = createAlertEngine({ userDataPath: folder, getSettings: () => ({ ...DEFAULTS, sustainedSeconds: 10 }), notify, clock: () => now });
  engine.sample({ cpu: { load: 95 }, memory: { usedPercent: 45 }, storage: [] });
  now += 9_000; engine.sample({ cpu: { load: 95 }, memory: { usedPercent: 45 }, storage: [] });
  expect(notify).not.toHaveBeenCalled();
  now += 1_000; engine.sample({ cpu: { load: 95 }, memory: { usedPercent: 45 }, storage: [] });
  expect(notify).toHaveBeenCalledTimes(1);
  expect(engine.list()[0].kind).toBe('cpu');
  now += 3_000; engine.sample({ cpu: { load: 95 }, memory: { usedPercent: 45 }, storage: [] });
  expect(notify).toHaveBeenCalledTimes(1);
});
