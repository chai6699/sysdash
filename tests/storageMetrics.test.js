const { normalizeVolume, normalizeVolumes } = require('../src/main/storageMetrics');

test('APFS shared container uses shared-free capacity without mismatched used/total labels', () => {
  const gb = 1024 ** 3;
  const v = normalizeVolume({ fs: '/dev/disk3s1s1', mount: '/', type: 'APFS',
    size: 228.3 * gb, used: 11.4 * gb, available: 15.2 * gb, use: 43 });
  expect(v.sharedCapacity).toBe(true);
  expect(v.volumeUsePercent).toBe(43);
  expect(v.usedPercent).toBeCloseTo(93.3, 1);
  expect(v.free).toBe(15.2 * gb);
});

test('a normal non-APFS volume retains its reported percentage', () => {
  const v = normalizeVolume({ fs: '/dev/sda1', mount: '/', type: 'ext4',
    size: 1000, used: 600, available: 400, use: 60 });
  expect(v.sharedCapacity).toBe(false);
  expect(v.usedPercent).toBe(60);
});

test('put macOS root and Data volume ahead of auxiliary mounts', () => {
  const size = 1000;
  const rows = normalizeVolumes([
    { fs: 'VM', mount: '/System/Volumes/VM', type: 'APFS', size, used: 100, available: 100, use: 50 },
    { fs: 'Data', mount: '/System/Volumes/Data', type: 'APFS', size, used: 100, available: 100, use: 50 },
    { fs: 'root', mount: '/', type: 'APFS', size, used: 100, available: 100, use: 50 },
  ]);
  expect(rows.map((r) => r.mount)).toEqual(['/', '/System/Volumes/Data', '/System/Volumes/VM']);
});
