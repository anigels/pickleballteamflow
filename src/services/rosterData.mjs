// Library IDs deliberately remain separate from Home's positional gameplay IDs.
export const ROSTER_SCHEMA_VERSION = 1;

export function emptyRosterData() {
  return {
    schemaVersion: ROSTER_SCHEMA_VERSION,
    players: [],
    rosters: [],
    workingRoster: { namesText: '', courtCount: 2, roundCount: 7 }
  };
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isLabel = value => typeof value === 'string' && value.trim().length > 0;
const validCount = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function isWorkingRoster(value) {
  return isRecord(value) && typeof value.namesText === 'string' &&
    validCount(value.courtCount, 2, 12) && validCount(value.roundCount, 1, 12);
}

// Reject the whole document rather than silently dropping players or references.
// Future schema versions must be explicitly migrated before being written.
export function isRosterData(value) {
  if (!isRecord(value) || value.schemaVersion !== ROSTER_SCHEMA_VERSION ||
      !Array.isArray(value.players) || !Array.isArray(value.rosters) ||
      !isWorkingRoster(value.workingRoster)) return false;

  const playerIds = new Set();
  for (const player of value.players) {
    if (!isRecord(player) || !isLabel(player.id) || !isLabel(player.displayName) ||
        playerIds.has(player.id)) return false;
    playerIds.add(player.id);
  }
  const rosterIds = new Set();
  for (const roster of value.rosters) {
    if (!isRecord(roster) || !isLabel(roster.id) || !isLabel(roster.name) ||
        rosterIds.has(roster.id) || !Array.isArray(roster.playerIds) ||
        new Set(roster.playerIds).size !== roster.playerIds.length ||
        !roster.playerIds.every(id => playerIds.has(id))) return false;
    rosterIds.add(roster.id);
  }
  return true;
}

function copyData(data) {
  if (!isRosterData(data)) throw new TypeError('Invalid saved-roster data');
  return JSON.parse(JSON.stringify(data));
}

const newId = () => globalThis.crypto.randomUUID();

export function addSavedPlayer(data, displayName, makeId = newId) {
  const next = copyData(data);
  const id = makeId();
  if (!isLabel(displayName) || !isLabel(id) || next.players.some(p => p.id === id)) {
    throw new TypeError('Invalid player name or ID');
  }
  // Equal display names are allowed; identity must never be inferred from a name.
  next.players.push({ id, displayName: displayName.trim() });
  return next;
}

export function renameSavedPlayer(data, id, displayName) {
  const next = copyData(data);
  const player = next.players.find(p => p.id === id);
  if (!player || !isLabel(displayName)) throw new TypeError('Invalid player');
  player.displayName = displayName.trim();
  return next;
}

export function saveNamedRoster(data, { id, name, playerIds }, makeId = newId) {
  const next = copyData(data);
  const roster = { id: id ?? makeId(), name: typeof name === 'string' ? name.trim() : name, playerIds };
  const index = next.rosters.findIndex(r => r.id === roster.id);
  if (id == null && index >= 0) throw new TypeError('Duplicate roster ID');
  if (index < 0) next.rosters.push(roster);
  else next.rosters[index] = roster;
  return copyData(next);
}
