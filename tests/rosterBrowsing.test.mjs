import test from 'node:test';
import assert from 'node:assert/strict';
import { browseSavedPlayers, searchSavedRosters } from '../src/services/rosterBrowsing.mjs';
import { emptyRosterData, addSavedPlayer, saveNamedRoster } from '../src/services/rosterData.mjs';

test('alphabetical browsing and filtering do not mutate player or membership order', () => {
  const players = [{id:'z',displayName:'Zoe'}, {id:'a',displayName:'Andrea'}, {id:'m',displayName:'Marco'}];
  const roster = {id:'r',name:'Tuesday Group',playerIds:['z','m','a']};
  const before = JSON.stringify({players,roster});
  assert.deepEqual(browseSavedPlayers(players).map(p => p.id), ['a','m','z']);
  assert.deepEqual(browseSavedPlayers(players,' MAR ').map(p => p.id), ['m']);
  assert.equal(JSON.stringify({players,roster}), before);
  assert.deepEqual(searchSavedRosters([roster], ' tUes '), [roster]);
  assert.deepEqual(searchSavedRosters([roster], 'Friday'), []);
});

test('both new and renamed saved rosters reject conflicting normalized titles', () => {
  let data = addSavedPlayer(emptyRosterData(), 'Andrea', () => 'p');
  data = saveNamedRoster(data, {name:'Tuesday',playerIds:['p']}, () => 'a');
  data = saveNamedRoster(data, {name:'Friday',playerIds:['p']}, () => 'b');
  const before = JSON.stringify(data);
  assert.throws(() => saveNamedRoster(data,{name:' TUESDAY ',playerIds:['p']},()=> 'c'), /already exists/);
  assert.throws(() => saveNamedRoster(data,{id:'b',name:'tuesday',playerIds:['p']}), /already exists/);
  assert.throws(() => saveNamedRoster(data,{id:'missing',name:'New',playerIds:['p']}), /no longer exists/);
  assert.equal(JSON.stringify(data),before);
  assert.equal(saveNamedRoster(data,{id:'a',name:'Tuesday',playerIds:['p']}).rosters[0].id,'a');
});

test('legacy duplicate roster titles remain readable and editable without migration', () => {
  const data = emptyRosterData();
  data.rosters = [{id:'a',name:'Group',playerIds:[]},{id:'b',name:'Group',playerIds:[]}];
  assert.equal(saveNamedRoster(data,{id:'a',name:'Group',playerIds:[]}).rosters.length,2);
});
