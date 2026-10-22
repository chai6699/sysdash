'use strict';

// On macOS, several APFS volumes can share the same underlying disk container.
// Each volume can report its own bytes used together with the same shared free
// bytes and the container's total capacity. In that situation, the `use` field
// is not a percentage of `size`, so never display "used / size (use%)".
const numberOrNull = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
const percent = (n) => numberOrNull(n) === null ? null : Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
const usedFraction = (used, total) => total > 0 ? percent(100 * used / total) : null;

function normalizeVolume(raw) {
  if (!raw || numberOrNull(raw.size) === null || raw.size <= 0) return null;
  const size = raw.size;
  const measuredUsed = numberOrNull(raw.used);
  const measuredFree = numberOrNull(raw.available);
  const used = measuredUsed ?? Math.max(0, size - (measuredFree ?? 0));
  const free = measuredFree ?? Math.max(0, size - used);
  const type = String(raw.type || '').slice(0, 40);
  const isApfs = /apfs/i.test(type);
  // A significant gap represents capacity occupied by sibling APFS volumes,
  // snapshots, reserves, or other filesystem accounting—not missing disk space.
  const sharedCapacity = isApfs && measuredUsed !== null && measuredFree !== null &&
    size > measuredUsed + measuredFree + size * 0.05;
  const volumeUsePercent = percent(raw.use) ?? usedFraction(used, used + free);
  // For shared APFS, the available capacity is the useful host-level warning
  // signal. This is an approximate allocation %, not the volume's own usage %.
  const usedPercent = sharedCapacity ? usedFraction(size - free, size) :
    (percent(raw.use) ?? usedFraction(used, size));
  return {
    name: String(raw.fs || raw.mount || 'Drive').slice(0, 100),
    mount: String(raw.mount || '').slice(0, 100),
    type,
    size, used, free,
    usedPercent,
    volumeUsePercent,
    sharedCapacity,
  };
}
function storageSort(a, b) {
  function rank(x) {
    if (x.mount === '/' || /^C:[\\/]/i.test(x.mount) || x.mount === 'C:') return 0;
    if (x.mount === '/System/Volumes/Data') return 1;
    if (x.mount.startsWith('/System/Volumes/')) return 5;
    return 2;
  }
  return rank(a) - rank(b);
}
function normalizeVolumes(items) {
  return (Array.isArray(items) ? items : [])
    .map(normalizeVolume)
    .filter(Boolean)
    .sort(storageSort)
    .slice(0, 32);
}
module.exports = { normalizeVolume, normalizeVolumes };
