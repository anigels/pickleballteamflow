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
const isPlayerName = value => isLabel(value) && !/[\r\n]/.test(value);
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

export function createRosterId(crypto = globalThis.crypto) {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Some embedded webviews expose secure random bytes but not randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const newId = () => createRosterId();

export function addSavedPlayer(data, displayName, makeId = newId) {
  const next = copyData(data);
  const id = makeId();
  if (!isPlayerName(displayName) || !isLabel(id) || next.players.some(p => p.id === id)) {
    throw new TypeError('Invalid player name or ID');
  }
  // Equal display names are allowed; identity must never be inferred from a name.
  next.players.push({ id, displayName: displayName.trim() });
  return next;
}

export function renameSavedPlayer(data, id, displayName) {
  const next = copyData(data);
  const player = next.players.find(p => p.id === id);
  if (!player || !isPlayerName(displayName)) throw new TypeError('Invalid player');
  player.displayName = displayName.trim();
  return next;
}

export function saveNamedRoster(data, { id, name, playerIds }, makeId = newId) {
  const next = copyData(data);
  const roster = { id: id ?? makeId(), name: typeof name === 'string' ? name.trim() : name, playerIds };
  const index = next.rosters.findIndex(r => r.id === roster.id);
  if (id != null && index < 0) throw new Error('Saved roster no longer exists. Reopen the library and try again.');
  const key = value => value.trim().normalize('NFKC').toLowerCase();
  // Existing duplicate titles remain readable; an unchanged legacy title can still be saved.
  const unchangedTitle = typeof roster.name === 'string' && index >= 0 && key(next.rosters[index].name) === key(roster.name);
  if (typeof roster.name === 'string' && !unchangedTitle && next.rosters.some(r => r.id !== roster.id && key(r.name) === key(roster.name))) {
    throw new Error('A roster with that name already exists. Choose a different name or edit the existing saved roster.');
  }
  if (id == null && index >= 0) throw new TypeError('Duplicate roster ID');
  if (index < 0) next.rosters.push(roster);
  else next.rosters[index] = roster;
  return copyData(next);
}

export function deleteNamedRoster(data, id) {
  const next = copyData(data);
  if (!next.rosters.some(r => r.id === id)) throw new TypeError('Roster not found');
  next.rosters = next.rosters.filter(r => r.id !== id);
  return next;
}

export function deleteSavedPlayer(data, id) {
  const next = copyData(data);
  if (next.rosters.some(r => r.playerIds.includes(id))) {
    throw new Error('Remove this player from saved rosters before deleting them.');
  }
  if (!next.players.some(p => p.id === id)) throw new TypeError('Player not found');
  next.players = next.players.filter(p => p.id !== id);
  return next;
}
