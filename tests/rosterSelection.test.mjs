import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRosterData, addSavedPlayer, renameSavedPlayer, saveNamedRoster, deleteSavedPlayer, deleteNamedRoster, createRosterId } from '../src/services/rosterData.mjs';
import { prepareRosterSelection } from '../src/services/rosterSelection.mjs';
import { createRosterPersistence } from '../src/services/rosterPersistence.mjs';

function library() {
  let data = addSavedPlayer(emptyRosterData(), 'Marco', () => 'a');
  return addSavedPlayer(data, 'Andrea', () => 'b');
}
function apply(overrides = {}) {
  return prepareRosterSelection({ data: library(), playerIds: ['b', 'a'], namesText: '', mode: 'replace', hasAssignments: false, ...overrides });
}

test('stable ID creation supports both UUID and random-byte webview APIs', () => {
  assert.equal(createRosterId({ randomUUID: () => 'native-uuid' }), 'native-uuid');
  assert.match(createRosterId({ getRandomValues: bytes => bytes.fill(255) }), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(createRosterId(), createRosterId());
});

test('selected order is preserved without changing library or gameplay IDs', () => {
  const data = library(), before = JSON.stringify(data);
  assert.equal(apply({ data }), 'Andrea\nMarco');
  assert.equal(JSON.stringify(data), before);
  assert.equal(apply({ namesText: 'Old names' }), 'Andrea\nMarco');
});
test('append preserves existing draft text and avoids an extra separator newline', () => {
  assert.equal(apply({ mode: 'append', namesText: '  Existing  \n' }), '  Existing  \nAndrea\nMarco');
  assert.equal(apply({ mode: 'append', namesText: 'Existing' }), 'Existing\nAndrea\nMarco');
});
test('any existing assignments block both append and replace, including completed sessions', () => {
  for (const closed of [true, false]) {
    const schedule = [{ index: 1, closed, courts: [{ players: [{ id: 1, name: 'Original' }] }], sitOut: [] }];
    const before = JSON.stringify(schedule);
    for (const mode of ['append', 'replace']) assert.throws(() => apply({ mode, hasAssignments: schedule.length > 0 }), /Clear Assignments/);
    assert.equal(JSON.stringify(schedule), before);
  }
});
test('identical display names are not silently merged or applied together', () => {
  const data = addSavedPlayer(library(), 'MARCO', () => 'c');
  assert.throws(() => apply({ data, playerIds: ['a', 'c'] }), /distinct names/);
  assert.throws(() => apply({ mode: 'append', namesText: 'marco' }), /distinct names/);
  assert.equal(apply({ data: renameSavedPlayer(data, 'c', 'Marco R'), playerIds: ['a', 'c'] }), 'Marco\nMarco R');
});
test('invalid selections fail before any draft is replaced', () => {
  for (const playerIds of [[], ['missing'], ['a', 'a'], null]) assert.throws(() => apply({ playerIds }));
  assert.throws(() => apply({ mode: 'unknown' }));
  const data = library(); data.players[0].displayName = 'Two\nPeople';
  assert.throws(() => apply({ data }), /single line/);
  assert.throws(() => addSavedPlayer(library(), 'Two\nPeople'), /Invalid/);
  assert.throws(() => renameSavedPlayer(library(), 'a', 'Two\rPeople'), /Invalid/);
});
test('drafts and named rosters can exceed 24 without altering generation validation', () => {
  let data = emptyRosterData();
  for (let i = 0; i < 30; i++) data = addSavedPlayer(data, `Player ${i}`, () => `p${i}`);
  assert.equal(apply({ data, playerIds: data.players.map(p => p.id) }).split('\n').length, 30);
});
test('library CRUD persists across reopen and keeps draft and unrelated storage intact', () => {
  const entries = new Map([['pickleball-team-flow.settings.v1', 'original']]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const store = createRosterPersistence(() => storage);
  let data = library();
  data.workingRoster.namesText = 'Existing draft';
  data = saveNamedRoster(data, { name: 'Tuesday', playerIds: ['a', 'b'] }, () => 'r');
  store.save(data);
  data = renameSavedPlayer(store.snapshot().data, 'a', 'Marco R');
  data = saveNamedRoster(data, { id: 'r', name: 'Wednesday', playerIds: ['b', 'a'] });
  store.save(data);
  const restored = createRosterPersistence(() => storage).snapshot().data;
  assert.deepEqual(restored.rosters[0], { id: 'r', name: 'Wednesday', playerIds: ['b', 'a'] });
  assert.equal(restored.players[0].displayName, 'Marco R');
  assert.equal(restored.workingRoster.namesText, 'Existing draft');
  assert.deepEqual(deleteSavedPlayer(restored, 'a').rosters[0].playerIds, ['b']);
  const deleted = deleteSavedPlayer(deleteNamedRoster(restored, 'r'), 'a');
  store.save(deleted);
  assert.deepEqual(createRosterPersistence(() => storage).snapshot().data.players.map(p => p.id), ['b']);
  assert.equal(entries.get('pickleball-team-flow.settings.v1'), 'original');
  assert.equal(restored.rosters.length, 1);
});
