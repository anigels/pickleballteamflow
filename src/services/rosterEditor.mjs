import { addSavedPlayer, renameSavedPlayer, saveNamedRoster, createRosterId } from './rosterData.mjs';

const key = name => name.trim().normalize('NFKC').toLowerCase();

// Match the import boundary's normalization without changing legacy identities.
export function reviewPlayerEntry(players, text) {
  const names = text.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const seen = new Set(players.map(player => key(player.displayName)));
  const accepted = [], skipped = [];
  for (const name of names) {
    if (seen.has(key(name))) skipped.push(name);
    else { seen.add(key(name)); accepted.push(name); }
  }
  return { count: names.length, accepted, skipped };
}

export function stagePlayers(players, text, makeId = createRosterId) {
  const review = reviewPlayerEntry(players, text);
  const additions = review.accepted.map(displayName => ({ id: makeId(), displayName }));
  if (new Set([...players, ...additions].map(p => p.id)).size !== players.length + additions.length) throw new Error('Duplicate player ID. Please try again.');
  return { ...review, additions };
}

export function prepareRosterEditorSave(data, { id, name, playerIds, stagedPlayers, renamedPlayers = {} }) {
  if (!name.trim()) throw new Error('Enter a roster name.');
  if (!playerIds.length) throw new Error('Select at least one player.');
  let next = data;
  for (const [playerId, displayName] of Object.entries(renamedPlayers)) {
    next = renameSavedPlayer(next, playerId, displayName);
  }
  // Recheck against the latest snapshot; never overwrite a concurrent library edit.
  for (const player of stagedPlayers) {
    if (!reviewPlayerEntry(next.players, player.displayName).accepted.length) throw new Error(`"${player.displayName}" is now in Saved Players. Cancel and reopen this roster to select the saved player.`);
    next = addSavedPlayer(next, player.displayName, () => player.id);
  }
  return saveNamedRoster(next, { id: id ?? undefined, name, playerIds: [...playerIds] });
}
