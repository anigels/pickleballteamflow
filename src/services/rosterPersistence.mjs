import { emptyRosterData, isRosterData } from './rosterData.mjs';

export const ROSTER_STORAGE_KEY = 'ptf.savedRosters';
const clone = value => JSON.parse(JSON.stringify(value));

// One document keeps player references and their library in the same storage write.
// Storage is injected for tests; accessing localStorage itself can throw.
export function createRosterPersistence(getStorage = () => globalThis.localStorage) {
  let data = emptyRosterData();
  let storage;
  let lastRaw = null;
  let status = 'ready';
  let blocked = false;
  try {
    storage = getStorage();
    lastRaw = storage.getItem(ROSTER_STORAGE_KEY);
    if (lastRaw !== null) {
      const parsed = JSON.parse(lastRaw);
      if (!isRosterData(parsed)) throw new TypeError('Unsupported or invalid roster data');
      data = parsed;
    }
  } catch {
    // Never replace unreadable data with defaults. The app can still work in memory.
    status = 'unavailable';
    blocked = true;
  }

  function snapshot() {
    return { data: clone(data), status };
  }

  function save(next) {
    if (!isRosterData(next)) return { ...snapshot(), status: 'invalid' };
    data = clone(next);
    if (blocked) return snapshot();
    try {
      // A second browser tab must not overwrite a newer library with stale data.
      if (storage.getItem(ROSTER_STORAGE_KEY) !== lastRaw) {
        blocked = true;
        status = 'conflict';
        return snapshot();
      }
      const raw = JSON.stringify(data);
      if (raw !== lastRaw) storage.setItem(ROSTER_STORAGE_KEY, raw);
      lastRaw = raw;
      status = 'ready';
    } catch {
      // Retain the current draft in memory; retry on the next edit after write failure.
      status = 'unavailable';
    }
    return snapshot();
  }

  return {
    snapshot,
    save,
    // Library editors commit only after durable storage succeeds. Existing draft
    // writes keep their memory fallback through save/saveWorkingRoster above.
    saveAtomic(next) {
      if (!isRosterData(next)) return { ...snapshot(), status: 'invalid' };
      if (blocked) return snapshot();
      try {
        if (storage.getItem(ROSTER_STORAGE_KEY) !== lastRaw) {
          blocked = true;
          status = 'conflict';
          return snapshot();
        }
        const raw = JSON.stringify(next);
        if (raw !== lastRaw) storage.setItem(ROSTER_STORAGE_KEY, raw);
        lastRaw = raw;
        data = clone(next);
        status = 'ready';
      } catch { status = 'unavailable'; }
      return snapshot();
    },
    saveWorkingRoster(workingRoster) {
      return save({ ...data, workingRoster });
    }
  };
}
