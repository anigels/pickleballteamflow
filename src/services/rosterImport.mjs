import { isRosterData, addSavedPlayer, saveNamedRoster, createRosterId } from './rosterData.mjs';

const nameKey = name => name.trim().normalize('NFKC').toLowerCase();

// Only the save-to-library boundary uses name matching. Gameplay parsing is unchanged.
export function reviewRosterImport(data, namesText) {
  const names = namesText.split('\n').map(name => name.trim()).filter(Boolean);
  const seen = new Set();
  const entries = names.map(name => {
    const key = nameKey(name);
    const matches = data.players.filter(player => nameKey(player.displayName) === key);
    const repeated = seen.has(key);
    seen.add(key);
    return { name, matches, repeated };
  });
  let error = names.length ? '' : 'Enter at least one player in the roster first.';
  for (const entry of entries) {
    if (entry.repeated) {
      error = `"${entry.name}" appears more than once. Review today's roster and give different players distinct names before saving.`;
      break;
    }
    if (entry.matches.length > 1) {
      error = `More than one saved player matches "${entry.name}". Rename them in the Players tab to distinguish them, then use the matching name in today's roster.`;
      break;
    }
  }
  return { entries, error, newCount: entries.filter(entry => !entry.matches.length).length,
    existingCount: entries.filter(entry => entry.matches.length === 1).length };
}

export function saveRosterFromText(data, { namesText, mode, rosterName = '', rosterId }, makeId = createRosterId) {
  if (!isRosterData(data)) throw new Error('Saved player data is unavailable.');
  if (!['players', 'new', 'update'].includes(mode)) throw new Error('Choose how to save this roster.');
  const review = reviewRosterImport(data, namesText);
  if (review.error) throw new Error(review.error);
  const target = mode === 'update' ? data.rosters.find(roster => roster.id === rosterId) : null;
  if (mode === 'update' && !target) throw new Error('Choose an existing saved roster to update.');
  if (mode === 'new') {
    if (!rosterName.trim()) throw new Error('Enter a name for the saved roster.');
    if (data.rosters.some(roster => nameKey(roster.name) === nameKey(rosterName))) {
      throw new Error('A roster with that name already exists. Choose Update saved roster or use a different name.');
    }
  }
  let next = data;
  const playerIds = review.entries.map(entry => {
    if (entry.matches.length === 1) return entry.matches[0].id;
    next = addSavedPlayer(next, entry.name, makeId);
    return next.players[next.players.length - 1].id;
  });
  if (mode !== 'players') {
    next = saveNamedRoster(next, {
      id: target?.id,
      name: target?.name ?? rosterName,
      playerIds
    }, makeId);
  }
  // Callers receive an independent document, even when every player already exists.
  return JSON.parse(JSON.stringify(next));
}
