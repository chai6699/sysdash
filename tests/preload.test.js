const mockExposed = {};
const mockInvoke = jest.fn().mockResolvedValue('ok');
jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (k, v) => { mockExposed[k] = v; } },
  ipcRenderer: { invoke: mockInvoke },
}), { virtual: true });
require('../src/preload/preload');
const { CHANNELS } = require('../src/main/channels');

test('a frozen and narrowly scoped preload surface is exposed', () => {
  expect(Object.keys(mockExposed.sysdash).sort()).toEqual([
    'getAlerts', 'getContainers', 'getCpu', 'getHistory', 'getMemory',
    'getOs', 'getOverview', 'getProcessTable', 'getProcesses', 'getSettings',
    'updateSettings', 'exportMetrics',
  ].sort());
  expect(Object.isFrozen(mockExposed.sysdash)).toBe(true);
  expect(mockExposed.sysdash.invoke).toBeUndefined();
  expect(mockExposed.ipcRenderer).toBeUndefined();
});
test('renderer IPC channels match the channel registry', async () => {
  mockInvoke.mockClear();
  await mockExposed.sysdash.getCpu();
  await mockExposed.sysdash.getMemory();
  await mockExposed.sysdash.getOs();
  await mockExposed.sysdash.getProcesses('bad');
  await mockExposed.sysdash.getOverview();
  await mockExposed.sysdash.getHistory('15m');
  await mockExposed.sysdash.getProcessTable({ sort: 'cpu' });
  await mockExposed.sysdash.getSettings();
  await mockExposed.sysdash.updateSettings({ theme: 'light' });
  await mockExposed.sysdash.getAlerts();
  await mockExposed.sysdash.getContainers();
  await mockExposed.sysdash.exportMetrics();
  expect(mockInvoke.mock.calls).toEqual([
    [CHANNELS.CPU], [CHANNELS.MEMORY], [CHANNELS.OS], [CHANNELS.PROCESSES, 25],
    [CHANNELS.OVERVIEW], [CHANNELS.HISTORY, '15m'], [CHANNELS.PROCESS_TABLE, { sort: 'cpu' }],
    [CHANNELS.SETTINGS_GET], [CHANNELS.SETTINGS_UPDATE, { theme: 'light' }],
    [CHANNELS.ALERTS], [CHANNELS.CONTAINERS], [CHANNELS.EXPORT],
  ]);
});
