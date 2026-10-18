import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRosterData, addSavedPlayer, saveNamedRoster } from '../src/services/rosterData.mjs';
import { reviewRosterImport, saveRosterFromText } from '../src/services/rosterImport.mjs';
import { createRosterPersistence } from '../src/services/rosterPersistence.mjs';

const ids = () => { let i = 0; return () => `new-${++i}`; };
const save = (data, options, makeId = ids()) => saveRosterFromText(data, { namesText: 'Marco\nAndrea', mode: 'players', ...options }, makeId);

test('first-time input saves trimmed names without changing the draft text or settings', () => {
  const data = emptyRosterData();
  data.workingRoster = { namesText: ' Marco \r\n\nAndrea\n', courtCount: 4, roundCount: 10 };
  const before = JSON.stringify(data);
  const result = save(data, { namesText: data.workingRoster.namesText });
  assert.deepEqual(result.players.map(p => p.displayName), ['Marco', 'Andrea']);
  assert.deepEqual(result.workingRoster, data.workingRoster);
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(result.rosters, []);
});
test('unique matching players are reused and repeated saves do not duplicate the library', () => {
  const data = addSavedPlayer(emptyRosterData(), 'Marco', () => 'original');
  const result = save(data, { namesText: ' marco \nAndrea' });
  assert.equal(result.players[0].id, 'original');
  assert.equal(result.players[0].displayName, 'Marco');
  assert.deepEqual(save(result, {}, () => assert.fail('No new IDs expected')), result);
});
test('a new named roster references existing/new players in input order', () => {
  const data = addSavedPlayer(emptyRosterData(), 'Andrea', () => 'original');
  const result = save(data, { mode: 'new', rosterName: ' Tuesday Morning ' });
  assert.deepEqual(result.rosters[0], { id: 'new-2', name: 'Tuesday Morning', playerIds: ['new-1', 'original'] });
});
test('explicit update replaces only the selected group and retains absent players', () => {
  const makeId = ids();
  let data = save(emptyRosterData(), { mode: 'new', rosterName: 'Tuesday' }, makeId);
  const target = data.rosters[0];
  data = saveNamedRoster(data, { name: 'Other group', playerIds: [...target.playerIds] }, makeId);
  const result = save(data, { mode: 'update', rosterId: target.id, namesText: 'Andrea\nGuest' }, makeId);
  assert.equal(result.rosters[0].id, target.id);
  assert.equal(result.rosters[0].name, 'Tuesday');
  assert.deepEqual(result.rosters[1], data.rosters[1]);
  assert.equal(result.players.length, 3);
  assert.deepEqual(result.rosters[0].playerIds, [data.players[1].id, result.players[2].id]);
  assert.deepEqual(data.rosters[0], target);
});
test('players-only save never changes named rosters', () => {
  const makeId = ids();
  const data = save(emptyRosterData(), { mode: 'new', rosterName: 'Tuesday' }, makeId);
  const result = save(data, { namesText: 'Guest' }, makeId);
  assert.deepEqual(result.rosters, data.rosters);
});
test('duplicates in input and ambiguous library matches require review with no partial writes', () => {
  let data = addSavedPlayer(emptyRosterData(), 'Marco', () => 'a');
  data = addSavedPlayer(data, 'MARCO', () => 'b');
  const before = JSON.stringify(data);
  assert.match(reviewRosterImport(data, 'Guest\nMarco').error, /More than one/);
  assert.throws(() => save(data, { namesText: 'Guest\nMarco' }, () => assert.fail('Must review first')), /More than one/);
  assert.throws(() => save(emptyRosterData(), { namesText: 'Marco\nmarco' }), /more than once/);
  assert.equal(JSON.stringify(data), before);
});
test('invalid targets and duplicate roster titles cannot silently create or overwrite a group', () => {
  const data = save(emptyRosterData(), { mode: 'new', rosterName: 'Tuesday' });
  for (const options of [
    { mode: 'new', rosterName: ' tuesday ' }, { mode: 'new', rosterName: ' ' },
    { mode: 'update', rosterId: 'missing' }, { namesText: ' \n' }, { mode: 'invalid' }
  ]) assert.throws(() => save(data, options, () => assert.fail('Validation must happen before creation')));
});
test('saving more than 24 players is supported without invoking generation', () => {
  const namesText = Array.from({ length: 30 }, (_, i) => `Player ${i}`).join('\n');
  const data = save(emptyRosterData(), { namesText, mode: 'new', rosterName: 'Club' });
  assert.equal(data.players.length, 30);
  assert.equal(data.rosters[0].playerIds.length, 30);
});
test('one document write saves the import and group, and reload retains the working draft', () => {
  let raw = null, writes = 0;
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; writes++; } };
  const store = createRosterPersistence(() => storage);
  const data = store.snapshot().data;
  data.workingRoster.namesText = 'Marco\nAndrea';
  store.save(save(data, { mode: 'new', rosterName: 'Tuesday' }));
  assert.equal(writes, 1);
  const restored = createRosterPersistence(() => storage).snapshot().data;
  assert.equal(restored.rosters[0].name, 'Tuesday');
  assert.equal(restored.workingRoster.namesText, data.workingRoster.namesText);
});
