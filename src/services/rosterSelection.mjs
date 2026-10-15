// This is a library-to-text boundary, not a change to gameplay's roster parser.
export function prepareRosterSelection({ data, playerIds, namesText, mode, hasAssignments }) {
  if (hasAssignments) throw new Error('Clear Assignments before adding saved players or loading a roster.');
  if (mode !== 'append' && mode !== 'replace') throw new Error('Invalid roster action.');
  if (!Array.isArray(playerIds) || !playerIds.length) throw new Error('Select at least one player.');
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Select each player only once.');
  const names = playerIds.map(id => {
    const player = data.players.find(p => p.id === id);
    if (!player) throw new Error('A selected player is no longer available. Reopen the library and try again.');
    if (!player.displayName.trim() || /[\r\n]/.test(player.displayName)) {
      throw new Error('Each saved player needs a name on a single line. Rename this player first.');
    }
    return player.displayName.trim();
  });
  const existing = mode === 'append' ? namesText.split('\n').map(n => n.trim()).filter(Boolean) : [];
  const seen = new Set(existing.map(n => n.normalize('NFKC').toLowerCase()));
  for (const name of names) {
    const key = name.normalize('NFKC').toLowerCase();
    if (seen.has(key)) throw new Error(`"${name}" would appear more than once. Give players distinct names, such as a last initial, before adding them.`);
    seen.add(key);
  }
  // Preserve existing draft text, including whitespace; never silently merge names.
  return mode === 'append' && namesText.length
    ? `${namesText}${namesText.endsWith('\n') ? '' : '\n'}${names.join('\n')}`
    : names.join('\n');
}
