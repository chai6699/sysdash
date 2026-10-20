const mockExposed = {};
const mockInvoke = jest.fn().mockResolvedValue('ok');
jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (k, v) => { mockExposed[k] = v; } },
  ipcRenderer: { invoke: mockInvoke },
}), { virtual: true });

require('../src/preload/preload');
const { CHANNELS } = require('../src/main/channels');

test('exposes only the four read-only methods', () => {
  expect(Object.keys(mockExposed.sysdash).sort()).toEqual(['getCpu', 'getMemory', 'getOs', 'getProcesses']);
  expect(Object.isFrozen(mockExposed.sysdash)).toBe(true);
});

test('does not leak ipcRenderer', () => {
  expect(mockExposed.sysdash.invoke).toBeUndefined();
  expect(mockExposed.ipcRenderer).toBeUndefined();
});

test('preload channels match main channels', async () => {
  await mockExposed.sysdash.getCpu();
  await mockExposed.sysdash.getMemory();
  await mockExposed.sysdash.getOs();
  await mockExposed.sysdash.getProcesses('bad');
  expect(mockInvoke.mock.calls).toEqual([
    [CHANNELS.CPU], [CHANNELS.MEMORY], [CHANNELS.OS], [CHANNELS.PROCESSES, 25],
  ]);
});
