jest.mock('systeminformation', () => ({
  cpu: jest.fn().mockResolvedValue({ manufacturer: 'Intel', brand: 'Core i7', cores: 8, physicalCores: 4, speed: 3.2 }),
  currentLoad: jest.fn().mockResolvedValue({ currentLoad: 42.567, cpus: [{ load: 10.04 }, { load: 90.96 }] }),
  cpuTemperature: jest.fn().mockResolvedValue({ main: null }),
  mem: jest.fn().mockResolvedValue({ total: 1000, active: 250, available: 750, swaptotal: 0, swapused: 0 }),
  processes: jest.fn().mockResolvedValue({
    all: 3, running: 1,
    list: [
      { pid: 1, name: 'a', cpu: 1, mem: 1, command: '/secret', user: 'root' },
      { pid: 2, name: 'b', cpu: 50, mem: 2 },
      { pid: 3, name: 'c', cpu: 10, mem: 3 },
    ],
  }),
  osInfo: jest.fn().mockResolvedValue({ platform: 'win32', distro: 'Windows 11', release: '10.0', arch: 'x64', hostname: 'pc' }),
  time: jest.fn().mockReturnValue({ uptime: 3600 }),
}));

const s = require('../src/main/systemInfo');

test('getCpu rounds and maps values', async () => {
  const c = await s.getCpu();
  expect(c.brand).toBe('Intel Core i7');
  expect(c.load).toBe(42.6);
  expect(c.perCore).toEqual([10, 91]);
});

test('getMemory computes percentage', async () => {
  expect((await s.getMemory()).usedPercent).toBe(25);
});

test('getProcesses sorts by CPU, limits, and strips sensitive fields', async () => {
  const p = await s.getProcesses(2);
  expect(p.list.map((x) => x.pid)).toEqual([2, 3]);
  expect(Object.keys(p.list[0]).sort()).toEqual(['cpu', 'mem', 'name', 'pid']);
});

test.each([[undefined, 25], [-5, 25], ['abc', 25], [10, 10], [9999, 200]])('clampLimit(%p) -> %p', (i, o) => {
  expect(s.clampLimit(i)).toBe(o);
});

test('getOs returns uptime', async () => {
  expect((await s.getOs()).uptime).toBe(3600);
});
