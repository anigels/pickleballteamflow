// Presentation only: never sort stored player arrays or saved roster membership.
const key = value => value.trim().normalize('NFKC').toLowerCase();
export function browseSavedPlayers(players, query = '') {
  return players.filter(player => key(player.displayName).includes(key(query)))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base', numeric: true }));
}
export function searchSavedRosters(rosters, query = '') {
  return rosters.filter(roster => key(roster.name).includes(key(query)));
}
