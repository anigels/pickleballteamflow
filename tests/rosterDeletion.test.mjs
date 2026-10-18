import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRosterData, deleteSavedPlayer, isRosterData } from '../src/services/rosterData.mjs';
import { createRosterPersistence, ROSTER_STORAGE_KEY } from '../src/services/rosterPersistence.mjs';
function fixture(count) {
  const data = emptyRosterData();
  data.players = [{id:'a',displayName:'Same Name'},{id:'b',displayName:'Same Name'}];
  data.workingRoster.namesText = 'Same Name\nGuest';
  data.rosters = Array.from({length:count},(_,i)=>({id:`r${i}`,name:`Group ${i}`,playerIds:i ? ['b','a'] : ['a']}));
  return data;
}
for (const count of [0,1,3]) test(`delete stable ID from ${count} rosters without changing draft or other identities`, () => {
  const data = fixture(count), before = JSON.stringify(data);
  const next = deleteSavedPlayer(data,'a');
  assert.ok(isRosterData(next));
  assert.equal(JSON.stringify(data),before);
  assert.deepEqual(next.players,[data.players[1]]);
  assert.deepEqual(next.workingRoster,data.workingRoster);
  assert.equal(next.rosters.length,count);
  if (count) assert.deepEqual(next.rosters[0].playerIds,[]);
  for (const group of next.rosters.slice(1)) assert.deepEqual(group.playerIds,['b']);
});
test('one atomic document write survives reopening; failed write preserves disk and consistent memory', () => {
  let raw = JSON.stringify(fixture(3)), writes = 0, fail = false;
  const storage = {getItem:()=>raw,setItem(key,value){assert.equal(key,ROSTER_STORAGE_KEY); writes++; if(fail) throw Error('quota'); raw=value;}};
  const store = createRosterPersistence(()=>storage);
  store.save(deleteSavedPlayer(store.snapshot().data,'a'));
  assert.equal(writes,1);
  assert.deepEqual(createRosterPersistence(()=>storage).snapshot().data,store.snapshot().data);
  const persisted = raw; fail=true;
  const result=store.save(deleteSavedPlayer(store.snapshot().data,'b'));
  assert.equal(result.status,'unavailable'); assert.equal(raw,persisted);
  assert.ok(isRosterData(result.data)); assert.equal(result.data.players.length,0);
  assert.equal(createRosterPersistence(()=>storage).snapshot().data.players.length,1);
});
