import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyRosterData, isRosterData, addSavedPlayer, renameSavedPlayer, saveNamedRoster
} from '../src/services/rosterData.mjs';

test('duplicate display names retain distinct stable identities', () => {
  let data = addSavedPlayer(emptyRosterData(), ' Alex ', () => 'a');
  data = addSavedPlayer(data, 'Alex', () => 'b');
  assert.deepEqual(data.players, [{ id: 'a', displayName: 'Alex' }, { id: 'b', displayName: 'Alex' }]);
  assert.throws(() => addSavedPlayer(data, 'Other', () => 'a'));
});

test('rename and roster reorder preserve player IDs without mutating previous data', () => {
  let data = addSavedPlayer(emptyRosterData(), 'Marco', () => 'a');
  data = addSavedPlayer(data, 'Andrea', () => 'b');
  data = saveNamedRoster(data, { name: 'Tuesday', playerIds: ['a', 'b'] }, () => 'r');
  const renamed = renameSavedPlayer(data, 'a', 'Marco R');
  const reordered = saveNamedRoster(renamed, { id: 'r', name: 'Tuesday', playerIds: ['b', 'a'] });
  assert.equal(data.players[0].displayName, 'Marco');
  assert.equal(reordered.players[0].id, 'a');
  assert.deepEqual(renamed.rosters[0].playerIds, ['a', 'b']);
  assert.deepEqual(reordered.rosters[0].playerIds, ['b', 'a']);
  assert.equal(reordered.rosters.length, 1);
});

test('library and saved rosters may exceed the session limit', () => {
  let data = emptyRosterData();
  for (let i = 0; i < 100; i++) data = addSavedPlayer(data, `Player ${i}`, () => `p${i}`);
  data = saveNamedRoster(data, { name: 'Club', playerIds: data.players.map(p => p.id) }, () => 'r');
  assert.equal(isRosterData(data), true);
  assert.equal(data.players.length, 100);
});

test('dangling references, duplicate membership and generated ID collisions are rejected', () => {
  let data = addSavedPlayer(emptyRosterData(), 'Alex', () => 'a');
  assert.throws(() => saveNamedRoster(data, { name: 'Club', playerIds: ['missing'] }, () => 'r'));
  assert.throws(() => saveNamedRoster(data, { name: 'Club', playerIds: ['a', 'a'] }, () => 'r'));
  data = saveNamedRoster(data, { name: 'Club', playerIds: ['a'] }, () => 'r');
  assert.throws(() => saveNamedRoster(data, { name: 'Other', playerIds: [] }, () => 'r'));
  assert.throws(() => renameSavedPlayer(data, 'missing', 'New'));
  assert.throws(() => addSavedPlayer(data, '  '));
});

for (const [label, change] of [
  ['future version', d => { d.schemaVersion = 2; }],
  ['missing version', d => { delete d.schemaVersion; }],
  ['invalid players', d => { d.players = {}; }],
  ['missing working roster', d => { delete d.workingRoster; }],
  ['invalid text', d => { d.workingRoster.namesText = null; }],
  ['invalid courts', d => { d.workingRoster.courtCount = 99; }],
  ['invalid rounds', d => { d.workingRoster.roundCount = 0; }],
  ['duplicate player IDs', d => { d.players = [{ id: 'a', displayName: 'A' }, { id: 'a', displayName: 'B' }]; }],
  ['duplicate roster IDs', d => { d.rosters = [{ id: 'r', name: 'A', playerIds: [] }, { id: 'r', name: 'B', playerIds: [] }]; }]
]) test(`rejects ${label}`, () => {
  const data = emptyRosterData(); change(data);
  assert.equal(isRosterData(data), false);
});

test('fresh documents are independent and retain incomplete draft text', () => {
  const data = emptyRosterData();
  data.workingRoster.namesText = '  Marco\nAndr\n\n';
  assert.equal(isRosterData(data), true);
  assert.equal(emptyRosterData().workingRoster.namesText, '');
});
